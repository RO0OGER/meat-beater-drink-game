import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Round } from '../model/Round';
import { GameService } from '../services/game.service';
import { RoundService } from '../services/round';
import { AuthService } from '../services/auth.service';
import { RoundPlayerService } from '../services/round-player.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPage implements OnInit {
  rounds: Round[] = [];
  username = '';
  loading = true;
  activeRoundId: string | null = null;

  constructor(
    private gameService: GameService,
    private roundService: RoundService,
    private auth: AuthService,
    private router: Router,
    private playerSvc: RoundPlayerService,
  ) {}

  async ngOnInit() {
    this.username = this.auth.currentUser?.email?.split('@')[0] ?? '';
    this.rounds = await this.roundService.getAllRounds();

    const savedId = this.playerSvc.getActiveSessionRoundId();
    if (savedId) {
      const round = await this.roundService.getRoundById(savedId);
      if (round && round.status === 'playing') {
        this.activeRoundId = savedId;
      } else {
        this.playerSvc.clearActiveSession();
      }
    }

    this.loading = false;
  }

  resumeGame() {
    if (this.activeRoundId) {
      this.router.navigate(['/round', this.activeRoundId, 'personal']);
    }
  }

  async createRound() {
    const game = await this.gameService.getOrCreateDefaultGame();
    if (!game) return;
    this.router.navigate(['/game', game.id, 'round', 'new']);
  }

  openLobby(round: Round) {
    this.router.navigate(['/round', round.id, 'lobby']);
  }

  setupDrinks(round: Round) {
    this.router.navigate(['/game', round.game_id, 'round', round.id, 'add-drinks']);
  }

  async deleteRound(round: Round, event: Event) {
    event.stopPropagation();
    if (!confirm(`Runde "${round.round_code}" wirklich löschen?`)) return;
    await this.roundService.deleteRoundById(round.id);
    this.rounds = this.rounds.filter(r => r.id !== round.id);
  }

  statusLabel(round: Round): string {
    if (round.status === 'playing') return 'Läuft';
    if (round.status === 'ended')   return 'Beendet';
    return 'Lobby';
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
