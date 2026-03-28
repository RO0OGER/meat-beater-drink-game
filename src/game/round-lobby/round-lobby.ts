import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RoundService } from '../../services/round';
import { RoundPlayerService } from '../../services/round-player.service';
import { TaskService } from '../../services/task';
import { AuthService } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase';
import { Round } from '../../model/Round';
import { RoundPlayer } from '../../model/RoundPlayer';

@Component({
  selector: 'app-round-lobby',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './round-lobby.html',
  styleUrls: ['./round-lobby.scss'],
})
export class RoundLobbyPage implements OnInit, OnDestroy {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private roundSvc = inject(RoundService);
  private playerSvc = inject(RoundPlayerService);
  private taskSvc  = inject(TaskService);
  private auth     = inject(AuthService);
  private supabase = inject(SupabaseService);

  roundId   = '';
  round     = signal<Round | null>(null);
  players   = signal<RoundPlayer[]>([]);
  myPlayer  = signal<RoundPlayer | null>(null);
  isHost    = signal(false);
  starting  = signal(false);
  joinUrl   = signal('');
  copied    = signal(false);

  private channel: any = null;

  team1Players = () => this.players().filter(p => p.team === 'team1');
  team2Players = () => this.players().filter(p => p.team === 'team2');

  async ngOnInit() {
    this.roundId = this.route.snapshot.paramMap.get('roundId') ?? '';
    this.joinUrl.set(`${window.location.origin}/join/${await this.getCode()}`);

    await this.load();

    const user = await this.auth.getCurrentUser();
    this.isHost.set(!!user);

    this.channel = this.supabase.client
      .channel(`lobby:${this.roundId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_players', filter: `round_id=eq.${this.roundId}` }, () => this.loadPlayers())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `id=eq.${this.roundId}` }, (payload: any) => {
        const r = payload.new as Round;
        this.round.set(r);
        if (r.status === 'playing') {
          this.router.navigate(['/round', this.roundId, 'personal']);
        }
      })
      .subscribe();
  }

  ngOnDestroy() {
    this.channel?.unsubscribe();
  }

  private async getCode(): Promise<string> {
    const r = await this.roundSvc.getRoundById(this.roundId);
    return r?.round_code ?? this.roundId;
  }

  private async load() {
    const [round, players, me] = await Promise.all([
      this.roundSvc.getRoundById(this.roundId),
      this.playerSvc.getPlayersByRound(this.roundId),
      this.playerSvc.getMyPlayer(this.roundId),
    ]);
    this.round.set(round);
    this.players.set(players);
    this.myPlayer.set(me);
  }

  private async loadPlayers() {
    const players = await this.playerSvc.getPlayersByRound(this.roundId);
    this.players.set(players);
  }

  async startGame() {
    const players = this.players();
    const t1 = players.filter(p => p.team === 'team1');
    const t2 = players.filter(p => p.team === 'team2');
    if (!t1.length || !t2.length) return;

    this.starting.set(true);
    const task = await this.taskSvc.getRandomTask();
    await this.roundSvc.startGame(this.roundId, players, task?.id ?? null);
    this.starting.set(false);
    this.router.navigate(['/round', this.roundId, 'personal']);
  }

  addDrinks() {
    const r = this.round();
    if (!r) return;
    this.router.navigate(['/game', r.game_id, 'round', this.roundId, 'add-drinks']);
  }

  async copyLink() {
    await navigator.clipboard.writeText(this.joinUrl());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
