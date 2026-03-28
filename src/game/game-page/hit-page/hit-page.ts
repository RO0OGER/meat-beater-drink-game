import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { RoundService } from '../../../services/round';

@Component({
  selector: 'app-hit-page',
  standalone: true,
  imports: [],
  templateUrl: './hit-page.html',
  styleUrl: './hit-page.scss',
})
export class HitPage implements OnInit {
  gameId = '';
  roundId = '';
  team: 'team1' | 'team2' = 'team1';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private roundService: RoundService
  ) {}

  ngOnInit() {
    this.gameId  = this.route.snapshot.paramMap.get('gameId')  ?? '';
    this.roundId = this.route.snapshot.paramMap.get('roundId') ?? '';
    const t = this.route.snapshot.paramMap.get('team') ?? 'team1';
    this.team = t === 'team2' ? 'team2' : 'team1';
  }

  async showTask() {
    await this.roundService.incrementHits(this.roundId, this.team);
    this.router.navigate(['/animation/task', this.team, this.gameId, this.roundId]);
  }

  backToGame() {
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'play']);
  }
}
