import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoundService } from '../../services/round';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss'
})
export class SettingsPage implements OnInit {
  roundCode = '';
  roundId = '';
  team1Hits = 0;
  team2Hits = 0;
  remainingTimeTeam1 = 0;
  remainingTimeTeam2 = 0;
  numPlayersTeam1 = 0;
  numPlayersTeam2 = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roundService: RoundService
  ) {}

  async ngOnInit() {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';
    this.roundId = await this.roundService.getIdByRoundCode(this.roundCode) ?? '';

    if (this.roundId) {
      this.team1Hits = await this.roundService.getTeam1Hits(this.roundId) ?? 0;
      this.team2Hits = await this.roundService.getTeam2Hits(this.roundId) ?? 0;
      this.remainingTimeTeam1 = await this.roundService.getRemainingTimeTeam1(this.roundId) ?? 0;
      this.remainingTimeTeam2 = await this.roundService.getRemainingTimeTeam2(this.roundId) ?? 0;
      this.numPlayersTeam1 = await this.roundService.getNumPlayersTeam1(this.roundId) ?? 0;
      this.numPlayersTeam2 = await this.roundService.getNumPlayersTeam2(this.roundId) ?? 0;
    }
  }

  async saveChanges() {
    await this.roundService.updateTeam1Hits(this.roundId, this.team1Hits);
    await this.roundService.updateTeam2Hits(this.roundId, this.team2Hits);
    await this.roundService.setRemainingTimeByCode(this.roundCode, 'team1', this.remainingTimeTeam1);
    await this.roundService.setRemainingTimeByCode(this.roundCode, 'team2', this.remainingTimeTeam2);
    await this.roundService.setNumPlayersTeam1(this.roundId, this.numPlayersTeam1);
    await this.roundService.setNumPlayersTeam2(this.roundId, this.numPlayersTeam2);

    this.router.navigate(['/game', this.roundCode]);
  }

  goToAddManually() {
    this.router.navigate(['/add-drinks', this.roundCode]);
  }

  goToAddWithScanner() {
    this.router.navigate(['/add-drink-scan', this.roundCode]);
  }
}
