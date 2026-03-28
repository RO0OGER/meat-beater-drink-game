import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoundService } from '../../services/round';
import { Round } from '../../model/Round';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage implements OnInit {
  gameId  = '';
  roundId = '';
  round: Round | null = null;

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
    this.gameId  = this.route.snapshot.paramMap.get('gameId')  ?? '';
    this.roundId = this.route.snapshot.paramMap.get('roundId') ?? '';
    this.round   = await this.roundService.getRoundById(this.roundId);

    if (this.round) {
      this.team1Hits          = this.round.team1_hits;
      this.team2Hits          = this.round.team2_hits;
      this.remainingTimeTeam1 = this.round.remaining_time_team1;
      this.remainingTimeTeam2 = this.round.remaining_time_team2;
      this.numPlayersTeam1    = this.round.num_players_team1;
      this.numPlayersTeam2    = this.round.num_players_team2;
    }
  }

  async saveChanges() {
    await this.roundService.updateRound(this.roundId, {
      team1_hits:           this.team1Hits,
      team2_hits:           this.team2Hits,
      remaining_time_team1: this.remainingTimeTeam1,
      remaining_time_team2: this.remainingTimeTeam2,
      num_players_team1:    this.numPlayersTeam1,
      num_players_team2:    this.numPlayersTeam2,
    });
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'play']);
  }

  endRound() {
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'end', 'team1']);
  }

  goToAddDrinks() {
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'add-drinks']);
  }

  goToAddWithScanner() {
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'add-drink-scan']);
  }
}
