import { Component } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {RoundService} from '../../../services/round';

@Component({
  selector: 'app-hit-team2',
  imports: [],
  templateUrl: './hit-team2.html',
  styleUrl: './hit-team2.scss'
})
export class HitTeam2 {
  roundCode = '';
  team = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private roundService: RoundService
  ) {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';
    this.team = 'team2'; // weil Komponente spezifisch für team1
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
