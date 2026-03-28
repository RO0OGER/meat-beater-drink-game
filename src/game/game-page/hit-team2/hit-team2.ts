// Replaced by hit-page component. Kept for backward compatibility.
import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { RoundService } from '../../../services/round';

@Component({
  selector: 'app-hit-team2',
  templateUrl: './hit-team2.html',
  styleUrl: './hit-team2.scss',
  standalone: true,
  imports: [],
})
export class HitTeam2 {
  gameId  = '';
  roundId = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private roundService: RoundService
  ) {
    this.gameId  = this.route.snapshot.paramMap.get('gameId')  ?? '';
    this.roundId = this.route.snapshot.paramMap.get('roundId') ?? '';
  }

  async showTask() {
    await this.roundService.incrementHits(this.roundId, 'team2');
    this.router.navigate(['/animation/task', 'team2', this.gameId, this.roundId]);
  }

  backToGame() {
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'play']);
  }
}
