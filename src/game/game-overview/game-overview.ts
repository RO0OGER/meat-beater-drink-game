import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Game } from '../../model/Game';
import { Round } from '../../model/Round';
import { GameService } from '../../services/game.service';
import { RoundService } from '../../services/round';

@Component({
  selector: 'app-game-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-overview.html',
  styleUrl: './game-overview.scss',
})
export class GameOverviewPage implements OnInit {
  gameId = '';
  game: Game | null = null;
  rounds: Round[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private roundService: RoundService,
  ) {}

  async ngOnInit() {
    this.gameId = this.route.snapshot.paramMap.get('gameId') ?? '';
    const [game, rounds] = await Promise.all([
      this.gameService.getGameById(this.gameId),
      this.roundService.getRoundsByGameId(this.gameId),
    ]);
    this.game = game;
    this.rounds = rounds;
    this.loading = false;
  }

  createRound() {
    this.router.navigate(['/game', this.gameId, 'round', 'new']);
  }

  openLobby(round: Round) {
    this.router.navigate(['/round', round.id, 'lobby']);
  }

  setupDrinks(round: Round) {
    this.router.navigate(['/game', this.gameId, 'round', round.id, 'add-drinks']);
  }

  async deleteRound(round: Round, event: Event) {
    event.stopPropagation();
    if (!confirm(`Runde "${round.round_code}" wirklich löschen?`)) return;
    await this.roundService.deleteRoundById(round.id);
    this.rounds = this.rounds.filter(r => r.id !== round.id);
  }

  back() {
    this.router.navigate(['/dashboard']);
  }

  statusLabel(round: Round): string {
    if (round.status === 'playing') return 'Läuft';
    if (round.status === 'ended')   return 'Beendet';
    return 'Lobby';
  }
}
