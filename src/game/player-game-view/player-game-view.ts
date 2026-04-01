import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RoundService } from '../../services/round';
import { RoundPlayerService } from '../../services/round-player.service';
import { TaskService } from '../../services/task';
import { AuthService } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase';
import { DrinkGeneratorService } from '../../services/generate-drink';
import { RoundDrinkService } from '../../services/round-drink.service';
import { Round } from '../../model/Round';
import { RoundPlayer } from '../../model/RoundPlayer';
import { Task } from '../../model/Task';
import { GeneratedDrinkEntry } from '../../model/GeneratedDrinkEntry';

type ViewState = 'loading' | 'lobby' | 'my-turn' | 'waiting' | 'confirm-hit' | 'i-drink' | 'other-drinks' | 'ended';

@Component({
  selector: 'app-player-game-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-game-view.html',
  styleUrls: ['./player-game-view.scss'],
})
export class PlayerGameView implements OnInit, OnDestroy {
  private route         = inject(ActivatedRoute);
  private router        = inject(Router);
  private roundSvc      = inject(RoundService);
  private playerSvc     = inject(RoundPlayerService);
  private taskSvc       = inject(TaskService);
  private auth          = inject(AuthService);
  private supabase      = inject(SupabaseService);
  private drinkGen      = inject(DrinkGeneratorService);
  private roundDrinkSvc = inject(RoundDrinkService);

  roundId  = '';
  round    = signal<Round | null>(null);
  players  = signal<RoundPlayer[]>([]);
  myPlayer = signal<RoundPlayer | null>(null);
  task     = signal<Task | null>(null);
  isHost   = signal(false);
  acting   = signal(false);

  currentDrink    = signal<GeneratedDrinkEntry | null>(null);
  remainingDrinks = signal<GeneratedDrinkEntry[]>([]);
  readonly cupIndices = Array.from({ length: 10 }, (_, i) => i);

  /** Anzahl getroffener Becher des verteidigenden Teams (0–10) */
  drinkPosition = computed(() => {
    const r = this.round();
    if (!r?.shooter_team) return 0;
    const hits = r.shooter_team === 'team1' ? (r.team1_hits ?? 0) : (r.team2_hits ?? 0);
    return Math.min(hits, 10);
  });

  timerRunning     = signal(false);
  timerSecondsLeft = signal(0);

  private channel: any       = null;
  private pollInterval: any  = null;
  private timerInterval: any = null;

  shooter     = computed(() => this.players().find(p => p.id === this.round()?.current_shooter_id) ?? null);
  target      = computed(() => this.players().find(p => p.id === this.round()?.current_target_id)  ?? null);
  shooterTeam = computed(() => this.round()?.shooter_team ?? null);

  viewState = computed<ViewState>(() => {
    const r  = this.round();
    const me = this.myPlayer();
    if (!r || !me) return 'loading';
    if (r.status === 'lobby') return 'lobby';
    if (r.status === 'ended') return 'ended';
    if (r.current_target_id) {
      if (me.id === r.current_target_id) {
        return r.current_task_id ? 'i-drink' : 'confirm-hit';
      }
      return 'other-drinks';
    }
    if (me.id === r.current_shooter_id) return 'my-turn';
    return 'waiting';
  });

  team1Players = computed(() => this.players().filter(p => p.team === 'team1'));
  team2Players = computed(() => this.players().filter(p => p.team === 'team2'));

  winnerTeam = computed<'team1' | 'team2' | null>(() => {
    const loser = this.round()?.loser_team;
    if (!loser) return null;
    return loser === 'team1' ? 'team2' : 'team1';
  });

  team1Time = computed(() => {
    if (this.timerRunning() && this.myPlayer()?.team === 'team1') return this.timerSecondsLeft();
    return this.round()?.remaining_time_team1 ?? 0;
  });

  team2Time = computed(() => {
    if (this.timerRunning() && this.myPlayer()?.team === 'team2') return this.timerSecondsLeft();
    return this.round()?.remaining_time_team2 ?? 0;
  });

  formatTime(s: number): string {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }

  async ngOnInit() {
    this.roundId = this.route.snapshot.paramMap.get('roundId') ?? '';

    const [round, players, me] = await Promise.all([
      this.roundSvc.getRoundById(this.roundId),
      this.playerSvc.getPlayersByRound(this.roundId),
      this.playerSvc.getMyPlayer(this.roundId),
    ]);

    if (!me) { this.router.navigate(['/join', round?.round_code ?? '']); return; }

    this.round.set(round);
    this.players.set(players);
    this.myPlayer.set(me);

    const user = await this.auth.getCurrentUser();
    this.isHost.set(!!user);

    if (round?.status === 'ended') {
      this.remainingDrinks.set(await this.drinkGen.getAllGeneratedDrinks(this.roundId));
    }

    if (round?.current_task_id) {
      const t = await this.taskSvc.getTaskById(round.current_task_id);
      this.task.set(t);
    }

    // Session persistieren für Reload
    if (round?.status === 'playing') {
      this.playerSvc.saveActiveSession(this.roundId);
    }

    // Drink laden wenn Target bereits bestätigt
    if (round?.current_target_id && round.current_task_id) {
      if (round.current_target_id === me.id) {
        await this.loadDrinkForMe();
      } else {
        await this.fetchCurrentDrink();
      }
    }

    this.channel = this.supabase.client
      .channel(`game:${this.roundId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rounds',
        filter: `id=eq.${this.roundId}`,
      }, async (payload: any) => {
        await this.applyRoundUpdate(payload.new as Round);
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'round_players',
        filter: `round_id=eq.${this.roundId}`,
      }, async () => {
        const players = await this.playerSvc.getPlayersByRound(this.roundId);
        this.players.set(players);
        const me = players.find(p => p.id === this.myPlayer()?.id);
        if (me) this.myPlayer.set(me);
      })
      .subscribe();

    this.pollInterval = setInterval(() => this.poll(), 2500);
  }

  ngOnDestroy() {
    this.channel?.unsubscribe();
    clearInterval(this.pollInterval);
    this.clearTimer();
  }

  private async applyRoundUpdate(r: Round) {
    const prev = this.round();
    this.round.set(r);

    if (r.status === 'lobby' && prev?.status !== 'lobby') {
      this.router.navigate(['/round', this.roundId, 'lobby']);
      return;
    }

    if (r.status === 'playing') this.playerSvc.saveActiveSession(this.roundId);
    if (r.status === 'ended') {
      this.playerSvc.clearActiveSession();
      this.remainingDrinks.set(await this.drinkGen.getAllGeneratedDrinks(this.roundId));
    }

    if (r.current_task_id && r.current_task_id !== prev?.current_task_id) {
      const t = await this.taskSvc.getTaskById(r.current_task_id);
      this.task.set(t);
    } else if (!r.current_task_id) {
      this.task.set(null);
    }

    const me = this.myPlayer();
    const taskJustConfirmed = r.current_task_id && r.current_task_id !== prev?.current_task_id;
    if (r.current_target_id && taskJustConfirmed) {
      if (me?.id === r.current_target_id) {
        this.clearTimer();
        await this.loadDrinkForMe();
      } else {
        await this.fetchCurrentDrink();
      }
    } else if (!r.current_target_id) {
      this.clearTimer();
      this.currentDrink.set(null);
    }
  }

  private async poll() {
    const [round, players] = await Promise.all([
      this.roundSvc.getRoundById(this.roundId),
      this.playerSvc.getPlayersByRound(this.roundId),
    ]);
    if (round) await this.applyRoundUpdate(round);
    if (players) {
      this.players.set(players);
      const me = players.find(p => p.id === this.myPlayer()?.id);
      if (me) this.myPlayer.set(me);
    }
  }

  private async loadDrinkForMe() {
    await this.fetchCurrentDrink();
    this.startTimer();
  }

  private async fetchCurrentDrink() {
    const drink = await this.drinkGen.getRandomGeneratedDrink(this.roundId);
    this.currentDrink.set(drink);
  }

  async onHit() {
    this.acting.set(true);
    const r = this.round();
    if (!r) { this.acting.set(false); return; }
    await this.roundSvc.proposeHit(this.roundId, r.shooter_team!, this.players());
    this.acting.set(false);
  }

  async onConfirmHit() {
    this.acting.set(true);
    const r    = this.round();
    const task = await this.taskSvc.getRandomTask();
    await this.roundSvc.confirmHit(this.roundId, task?.id ?? null);
    if (r?.shooter_team) {
      await this.roundSvc.incrementHits(this.roundId, r.shooter_team);
      const hitsBeforeIncrement = (r.shooter_team === 'team1' ? r.team1_hits : r.team2_hits) ?? 0;
      if (hitsBeforeIncrement + 1 >= 10) {
        const loserTeam: 'team1' | 'team2' = r.shooter_team === 'team1' ? 'team2' : 'team1';
        await this.roundSvc.endGame(this.roundId, loserTeam);
      }
    }
    this.acting.set(false);
  }

  async onDenyHit() {
    this.acting.set(true);
    await this.roundSvc.advanceTurn(this.roundId, this.players());
    this.acting.set(false);
  }

  async onMiss() {
    this.acting.set(true);
    await this.roundSvc.advanceTurn(this.roundId, this.players());
    this.acting.set(false);
  }

  async onDrinkDone() {
    this.acting.set(true);
    const me        = this.myPlayer();
    const drink     = this.currentDrink();
    const remaining = this.timerSecondsLeft();
    this.clearTimer();
    if (me) {
      await Promise.all([
        this.playerSvc.incrementDrinkCount(me.id),
        this.roundSvc.setRemainingTime(this.roundId, me.team as 'team1' | 'team2', remaining),
      ]);
    }
    if (drink?.id) await this.drinkGen.deleteGeneratedDrinkById(drink.id);
    this.currentDrink.set(null);
    await this.roundSvc.advanceTurn(this.roundId, this.players());
    this.acting.set(false);
  }

  private startTimer() {
    const me = this.myPlayer();
    const r  = this.round();
    if (!me || !r) return;
    const seconds = me.team === 'team1' ? r.remaining_time_team1 : r.remaining_time_team2;
    if (seconds <= 0) {
      this.triggerGameOver(me.team as 'team1' | 'team2');
      return;
    }
    this.timerSecondsLeft.set(seconds);
    this.timerRunning.set(true);
    this.timerInterval = setInterval(async () => {
      const left = this.timerSecondsLeft() - 1;
      if (left <= 0) {
        this.clearTimer();
        const loserTeam = this.myPlayer()?.team as 'team1' | 'team2';
        await this.triggerGameOver(loserTeam);
      } else {
        this.timerSecondsLeft.set(left);
      }
    }, 1000);
  }

  private async triggerGameOver(loserTeam: 'team1' | 'team2') {
    this.playerSvc.clearActiveSession();
    await this.roundSvc.endGame(this.roundId, loserTeam);
    // Sofort lokalen State aktualisieren ohne auf Realtime/Poll zu warten
    const updated = await this.roundSvc.getRoundById(this.roundId);
    if (updated) await this.applyRoundUpdate(updated);
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.timerRunning.set(false);
    this.timerSecondsLeft.set(0);
  }

  async endGame() {
    this.clearTimer();
    this.playerSvc.clearActiveSession();
    await this.roundSvc.endGame(this.roundId);
  }

  async goToLobby() {
    await Promise.all([
      this.drinkGen.deleteGeneratedDrinksByRoundId(this.roundId),
      this.roundDrinkSvc.deleteAllRoundDrinksByRoundId(this.roundId),
      this.roundSvc.resetToLobby(this.roundId),
    ]);
    this.router.navigate(['/round', this.roundId, 'lobby']);
  }
}
