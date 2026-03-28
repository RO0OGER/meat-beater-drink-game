import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RoundService } from '../../services/round';
import { RoundPlayerService } from '../../services/round-player.service';
import { TaskService } from '../../services/task';
import { AuthService } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase';
import { Round } from '../../model/Round';
import { RoundPlayer } from '../../model/RoundPlayer';
import { Task } from '../../model/Task';

type ViewState = 'loading' | 'lobby' | 'my-turn' | 'waiting' | 'i-drink' | 'other-drinks' | 'ended';

@Component({
  selector: 'app-player-game-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-game-view.html',
  styleUrls: ['./player-game-view.scss'],
})
export class PlayerGameView implements OnInit, OnDestroy {
  private route     = inject(ActivatedRoute);
  private router    = inject(Router);
  private roundSvc  = inject(RoundService);
  private playerSvc = inject(RoundPlayerService);
  private taskSvc   = inject(TaskService);
  private auth      = inject(AuthService);
  private supabase  = inject(SupabaseService);

  roundId  = '';
  round    = signal<Round | null>(null);
  players  = signal<RoundPlayer[]>([]);
  myPlayer = signal<RoundPlayer | null>(null);
  task     = signal<Task | null>(null);
  isHost   = signal(false);
  acting   = signal(false);

  private channel: any = null;
  private pollInterval: any = null;

  shooter   = computed(() => this.players().find(p => p.id === this.round()?.current_shooter_id) ?? null);
  target    = computed(() => this.players().find(p => p.id === this.round()?.current_target_id)  ?? null);
  shooterTeam = computed(() => this.round()?.shooter_team ?? null);

  viewState = computed<ViewState>(() => {
    const r = this.round();
    const me = this.myPlayer();
    if (!r || !me) return 'loading';
    if (r.status === 'lobby')  return 'lobby';
    if (r.status === 'ended')  return 'ended';

    // playing
    if (r.current_target_id) {
      // Someone has to drink
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

    this.channel = this.supabase.client
      .channel(`game:${this.roundId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `id=eq.${this.roundId}` }, async (payload: any) => {
        await this.applyRoundUpdate(payload.new as Round);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_players', filter: `round_id=eq.${this.roundId}` }, async () => {
        const players = await this.playerSvc.getPlayersByRound(this.roundId);
        this.players.set(players);
      })
      .subscribe();

    // Polling fallback in case Realtime is not enabled for these tables
    this.pollInterval = setInterval(() => this.poll(), 2500);
  }

  ngOnDestroy() {
    this.channel?.unsubscribe();
    clearInterval(this.pollInterval);
  }

  private async applyRoundUpdate(r: Round) {
    const prev = this.round();
    this.round.set(r);
    if (r.current_task_id && r.current_task_id !== prev?.current_task_id) {
      const t = await this.taskSvc.getTaskById(r.current_task_id);
      this.task.set(t);
    } else if (!r.current_task_id) {
      this.task.set(null);
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

  /** Shooter pressed HIT */
  async onHit() {
    this.acting.set(true);
    const r = this.round();
    const players = this.players();
    if (!r) return;
    const task = await this.taskSvc.getRandomTask();
    await this.roundSvc.registerHit(this.roundId, r.shooter_team!, players, task?.id ?? '');
    this.acting.set(false);
  }

  /** Shooter pressed MISS */
  async onMiss() {
    this.acting.set(true);
    await this.roundSvc.advanceTurn(this.roundId, this.players());
    this.acting.set(false);
  }

  /** Target confirmed drinking */
  async onDrinkDone() {
    this.acting.set(true);
    const me = this.myPlayer();
    if (me) await this.playerSvc.incrementDrinkCount(me.id);
    await this.roundSvc.advanceTurn(this.roundId, this.players());
    this.acting.set(false);
  }

  async endGame() {
    await this.roundSvc.endGame(this.roundId);
  }
}
