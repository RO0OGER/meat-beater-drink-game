import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RoundService } from '../../services/round';
import { RoundPlayerService } from '../../services/round-player.service';
import { TaskService } from '../../services/task';
import { AuthService } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase';
import { DrinkGeneratorService } from '../../services/generate-drink';
import { DrinkMethodService } from '../../services/drink-method.service';
import { Round } from '../../model/Round';
import { RoundPlayer } from '../../model/RoundPlayer';
import { Task } from '../../model/Task';
import { GeneratedDrinkEntry } from '../../model/GeneratedDrinkEntry';
import { DrinkMethod } from '../../model/DrinkMethod';

type ViewState = 'loading' | 'lobby' | 'my-turn' | 'waiting' | 'i-drink' | 'other-drinks' | 'ended';

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
  private drinkMethodSvc = inject(DrinkMethodService);

  roundId  = '';
  round    = signal<Round | null>(null);
  players  = signal<RoundPlayer[]>([]);
  myPlayer = signal<RoundPlayer | null>(null);
  task     = signal<Task | null>(null);
  isHost   = signal(false);
  acting   = signal(false);

  currentDrink   = signal<GeneratedDrinkEntry | null>(null);
  currentMethod  = signal<DrinkMethod | null>(null);
  readonly cupIndices = [0,1,2,3,4,5,6,7,8,9];

  /** Position im aktuellen 10er-Block: 1–10 */
  drinkPosition = computed(() => {
    const count = this.myPlayer()?.drink_count ?? 0;
    return (count % 10) + 1;
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
      if (me.id === r.current_target_id) return 'i-drink';
      return 'other-drinks';
    }
    if (me.id === r.current_shooter_id) return 'my-turn';
    return 'waiting';
  });

  team1Players = computed(() => this.players().filter(p => p.team === 'team1'));
  team2Players = computed(() => this.players().filter(p => p.team === 'team2'));

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

    if (round?.current_task_id) {
      const t = await this.taskSvc.getTaskById(round.current_task_id);
      this.task.set(t);
    }

    // Session persistieren für Reload
    if (round?.status === 'playing') {
      this.playerSvc.saveActiveSession(this.roundId);
    }

    // Falls schon beim Laden als Target gesetzt
    if (round?.current_target_id && round.current_target_id === me.id) {
      await this.loadDrinkForMe();
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

    if (r.status === 'playing') this.playerSvc.saveActiveSession(this.roundId);
    if (r.status === 'ended')   this.playerSvc.clearActiveSession();

    if (r.current_task_id && r.current_task_id !== prev?.current_task_id) {
      const t = await this.taskSvc.getTaskById(r.current_task_id);
      this.task.set(t);
    } else if (!r.current_task_id) {
      this.task.set(null);
    }

    const me = this.myPlayer();
    const targetChanged = r.current_target_id !== prev?.current_target_id;
    if (r.current_target_id && targetChanged && me?.id === r.current_target_id) {
      this.clearTimer();
      await this.loadDrinkForMe();
    } else if (!r.current_target_id) {
      this.clearTimer();
      this.currentDrink.set(null);
      this.currentMethod.set(null);
    }
  }

  private async poll() {
    const [round, players] = await Promise.all([
      this.roundSvc.getRoundById(this.roundId),
      this.playerSvc.getPlayersByRound(this.roundId),
    ]);
    if (round) await this.applyRoundUpdate(round);
    if (players) this.players.set(players);
  }

  private async loadDrinkForMe() {
    const [drink, method] = await Promise.all([
      this.drinkGen.getRandomGeneratedDrink(this.roundId),
      this.drinkMethodSvc.getRandom(),
    ]);
    this.currentDrink.set(drink);
    this.currentMethod.set(method);
  }

  async onHit() {
    this.acting.set(true);
    const r = this.round();
    if (!r) { this.acting.set(false); return; }
    const task = await this.taskSvc.getRandomTask();
    await this.roundSvc.registerHit(this.roundId, r.shooter_team!, this.players(), task?.id ?? '');
    this.acting.set(false);
  }

  async onMiss() {
    this.acting.set(true);
    await this.roundSvc.advanceTurn(this.roundId, this.players());
    this.acting.set(false);
  }

  async onDrinkDone() {
    this.clearTimer();
    this.acting.set(true);
    const me    = this.myPlayer();
    const drink = this.currentDrink();
    if (drink?.id) await this.drinkGen.deleteGeneratedDrinkById(drink.id);
    this.currentDrink.set(null);
    if (me) await this.playerSvc.incrementDrinkCount(me.id);
    await this.roundSvc.advanceTurn(this.roundId, this.players());
    this.acting.set(false);
  }

  startTimer() {
    const seconds = this.round()?.task_timer_seconds ?? 30;
    this.timerSecondsLeft.set(seconds);
    this.timerRunning.set(true);
    this.timerInterval = setInterval(async () => {
      const left = this.timerSecondsLeft() - 1;
      if (left <= 0) {
        this.clearTimer();
        const me = this.myPlayer();
        const loserTeam = me?.team as 'team1' | 'team2' | undefined;
        this.playerSvc.clearActiveSession();
        await this.roundSvc.endGame(this.roundId, loserTeam);
      } else {
        this.timerSecondsLeft.set(left);
      }
    }, 1000);
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
}
