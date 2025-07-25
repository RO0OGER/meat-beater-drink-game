import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoundDrinkService } from '../../services/round-drink.service';
import { RoundDrink } from '../../model/RoundDrink';
import { RoundService } from '../../services/round';
import { CommonModule } from '@angular/common';
import { DrinkGeneratorService } from '../../services/generate-drink';

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
  drinkChunks: RoundDrink[][] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roundDrinkService: RoundDrinkService,
    private roundService: RoundService,
    private drinkGeneratorService: DrinkGeneratorService
  ) {}

  async ngOnInit() {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';
    const roundId = await this.roundService.getIdByRoundCode(this.roundCode);

    if (!roundId) {
      console.error('Runde nicht gefunden');
      return;
    }

    this.drinks = await this.roundDrinkService.getRoundDrinksByRoundId(roundId);
    this.drinkChunks = this.chunkArray(this.drinks, 4); // Drinks paarweise gruppieren
  }

  async deleteDrink(drinkId: string) {
    await this.roundDrinkService.deleteRoundDrinkById(drinkId);
    this.drinks = this.drinks.filter((d) => d.id !== drinkId);
    this.drinkChunks = this.chunkArray(this.drinks, 2); // Nach dem Löschen neu gruppieren
  }

  addManual() {
    this.router.navigate(['/add-drink-manual', this.roundCode]);
  }

  addByScanner() {
    this.router.navigate(['/add-drink-scan', this.roundCode]);
  }

  async startGame() {
    const roundId = await this.roundService.getIdByRoundCode(this.roundCode);
    if (!roundId) {
      console.error('Runde nicht gefunden');
      return;
    }

    const result = await this.drinkGeneratorService.generateDrinks(roundId);

    if (typeof result === 'string') {
      alert(result); // z. B. "Das gegnerische Team darf den Drink bestimmen"
      return;
    }

    this.router.navigate(['/animation/start-round', this.roundCode]);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunked.push(array.slice(i, i + size));
    }
    return chunked;
  }
}
