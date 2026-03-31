import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RoundDrinkService } from '../../services/round-drink.service';
import { DrinkGeneratorService } from '../../services/generate-drink';
import { RoundDrink } from '../../model/RoundDrink';

@Component({
  selector: 'app-add-drinks',
  templateUrl: './add-drinks.html',
  styleUrls: ['./add-drinks.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class AddDrinksComponent implements OnInit {
  gameId  = '';
  roundId = '';
  drinks: RoundDrink[] = [];

  readonly TARGET     = DrinkGeneratorService.TARGET;
  readonly cupIndices = Array.from({ length: DrinkGeneratorService.TARGET }, (_, i) => i);

  get totalMl(): number {
    return this.drinks.reduce((s, d) => s + (d.quantity_ml ?? 0), 0);
  }

  get avgMlPerDrink(): number {
    return this.totalMl > 0 ? Math.round(this.totalMl / this.TARGET) : 0;
  }

  get tooSmall(): boolean {
    return this.totalMl > 0 && this.avgMlPerDrink < 200;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roundDrinkService: RoundDrinkService,
  ) {}

  async ngOnInit() {
    this.gameId  = this.route.snapshot.paramMap.get('gameId')  ?? '';
    this.roundId = this.route.snapshot.paramMap.get('roundId') ?? '';
    await this.loadDrinks();
  }

  async loadDrinks() {
    this.drinks = await this.roundDrinkService.getRoundDrinksByRoundId(this.roundId);
  }

  async deleteDrink(drinkId: string) {
    await this.roundDrinkService.deleteRoundDrinkById(drinkId);
    this.drinks = this.drinks.filter(d => d.id !== drinkId);
  }

  addManual() {
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'add-drink-manual']);
  }

  addByScanner() {
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'add-drink-scan']);
  }

  back() {
    this.router.navigate(['/round', this.roundId, 'lobby']);
  }
}
