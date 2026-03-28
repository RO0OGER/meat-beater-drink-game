import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RoundDrinkService } from '../../services/round-drink.service';
import { RoundDrink } from '../../model/RoundDrink';
import { DrinkGeneratorService } from '../../services/generate-drink';

@Component({
  selector: 'app-add-drinks',
  templateUrl: './add-drinks.html',
  styleUrls: ['./add-drinks.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class AddDrinksComponent implements OnInit {
  gameId = '';
  roundId = '';
  drinks: RoundDrink[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roundDrinkService: RoundDrinkService,
    private drinkGeneratorService: DrinkGeneratorService
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

  async startGame() {
    await this.drinkGeneratorService.deleteGeneratedDrinksByRoundId(this.roundId);
    await this.drinkGeneratorService.generateDrinks(this.roundId);
    this.router.navigate(['/animation/start-round', this.gameId, this.roundId]);
  }

  back() {
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'add-drinks']);
  }
}
