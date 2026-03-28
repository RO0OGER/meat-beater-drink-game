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
    private roundService: RoundService
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

  playRound(round: Round) {
    this.router.navigate(['/game', this.gameId, 'round', round.id, 'play']);
  }

  setupRound(round: Round) {
    this.router.navigate(['/game', this.gameId, 'round', round.id, 'add-drinks']);
  }

  back() {
    this.router.navigate(['/dashboard']);
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
