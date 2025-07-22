import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoundDrinkService } from '../../services/round-drink.service';
import { RoundDrink } from '../../model/RoundDrink';
import { RoundService } from '../../services/round';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-drinks',
  templateUrl: './add-drinks.html',
  styleUrls: ['./add-drinks.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class AddDrinksComponent implements OnInit {
  roundCode = '';
  drinks: RoundDrink[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roundDrinkService: RoundDrinkService,
    private roundService: RoundService
  ) {}

  async ngOnInit() {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';
    const roundId = await this.roundService.getIdByRoundCode(this.roundCode);

    if (!roundId) {
      console.error('Runde nicht gefunden');
      return;
    }

    this.drinks = await this.roundDrinkService.getRoundDrinksByRoundId(roundId);
  }

  async deleteDrink(drinkId: string) {
    await this.roundDrinkService.deleteRoundDrinkById(drinkId);
    this.drinks = this.drinks.filter((d) => d.id !== drinkId);
  }

  addManual() {
    this.router.navigate(['/add-drink-manual', this.roundCode]);
  }

  addByScanner() {
    this.router.navigate(['/add-drink-scan', this.roundCode]);
  }

  startGame() {
    this.router.navigate(['/game', this.roundCode]);
  }
}
