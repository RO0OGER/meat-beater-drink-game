import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoundService } from '../../services/round';
import { RoundDrinkService } from '../../services/round-drink.service';
import { DrinkGeneratorService } from '../../services/generate-drink';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-round-end',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './round-end.html',
  styleUrl: './round-end.scss',
})
export class RoundEnd {
  roundCode = '';
  team: 'team1' | 'team2' = 'team1'; // ✅ typisiert
  confirmDelete = false;
  showExtend = false;
  extraMinutes: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roundService: RoundService,
    private roundDrinkService: RoundDrinkService,
    private drinkGeneratorService: DrinkGeneratorService
  ) {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';
    const t = this.route.snapshot.paramMap.get('team');
    this.team = t === 'team2' ? 'team2' : 'team1'; // Fallback auf team1
  }

  async deleteEverything() {
    if (!this.roundCode) return;

    const round = await this.roundService.getRoundByCode(this.roundCode);
    if (!round) return;

    const roundId = round.id;

    await this.drinkGeneratorService.deleteGeneratedDrinksByRoundId(roundId);

    const roundDrinks = await this.roundDrinkService.getRoundDrinksByRoundId(roundId);
    for (const d of roundDrinks) {
      await this.roundDrinkService.deleteRoundDrinkById(d.id);
    }

    await this.roundService.deleteRoundById(roundId);

    this.router.navigate(['/']);
  }

  confirmAndDelete() {
    this.confirmDelete = true;
  }

  cancelDelete() {
    this.confirmDelete = false;
  }

  toggleExtend() {
    this.showExtend = true;
  }

  async applyExtraTime() {
    if (!this.extraMinutes || this.extraMinutes <= 0) return;

    const extraSeconds = this.extraMinutes * 60;
    const current = await this.roundService.getRemainingTimeByCode(this.roundCode, this.team);

    if (current === null) return;

    const success = await this.roundService.setRemainingTimeByCode(
      this.roundCode,
      this.team,
      current + extraSeconds
    );

    if (!success) {
      console.error('❌ Fehler beim Setzen der neuen Zeit');
      return;
    }

    this.router.navigate(['/game-countdown', this.team, this.roundCode, 'none']);
  }
}
