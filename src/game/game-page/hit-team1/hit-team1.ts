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
  roundCode = '';
  team = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private roundService: RoundService
  ) {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';
    this.team = 'team1'; // weil Komponente spezifisch für team1
  }

  async showTask() {
    const id = await this.roundService.getIdByRoundCode(this.roundCode);
    if (!id) return;

    const currentHits = await this.roundService.getTeam1Hits(id);
    if (currentHits === null) return;

    await this.roundService.updateTeam1Hits(id, currentHits + 1);

    this.router.navigate(['/animation/task', this.team, this.roundCode]);
  }

  backToGame() {
    this.router.navigate(['/game', this.roundCode]);
  }
}
