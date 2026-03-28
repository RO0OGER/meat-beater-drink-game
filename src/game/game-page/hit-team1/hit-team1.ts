// Replaced by hit-page component. Kept for backward compatibility.
import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { RoundService } from '../../../services/round';

@Component({
  selector: 'app-hit-team1',
  templateUrl: './hit-team1.html',
  styleUrl: './hit-team1.scss',
  standalone: true,
  imports: [],
})
export class HitTeam1 {
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
    await this.roundService.incrementHits(this.roundId, 'team1');
    this.router.navigate(['/animation/task', 'team1', this.gameId, this.roundId]);
  }

  backToGame() {
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'play']);
  }
}
