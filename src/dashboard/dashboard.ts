import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Game } from '../model/Game';
import { GameService } from '../services/game.service';
import { AuthService } from '../services/auth.service';
import { RoundPlayerService } from '../services/round-player.service';
import { RoundService } from '../services/round';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPage implements OnInit {
  games: Game[] = [];
  username = '';
  loading = true;
  activeRoundId: string | null = null;

  constructor(
    private gameService: GameService,
    private auth: AuthService,
    private router: Router,
    private playerSvc: RoundPlayerService,
    private roundSvc: RoundService,
  ) {}

  async ngOnInit() {
    this.username = this.auth.currentUser?.email?.split('@')[0] ?? '';
    this.games = await this.gameService.getUserGames();

    const savedId = this.playerSvc.getActiveSessionRoundId();
    if (savedId) {
      const round = await this.roundSvc.getRoundById(savedId);
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

  openGame(game: Game) {
    this.router.navigate(['/game', game.id]);
  }

  createGame() {
    this.router.navigate(['/game/new']);
  }

  async deleteGame(game: Game, event: Event) {
    event.stopPropagation();
    if (!confirm(`Spiel "${game.name}" wirklich löschen?`)) return;
    await this.gameService.deleteGame(game.id);
    this.games = this.games.filter(g => g.id !== game.id);
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
