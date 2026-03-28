import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { RoundService } from '../../../services/round';
import { GeneratedDrinkEntry } from '../../../model/GeneratedDrinkEntry';
import { DrinkGeneratorService } from '../../../services/generate-drink';
import { RoundDrinkService } from '../../../services/round-drink.service';
import { RoundPlayerService } from '../../../services/round-player.service';
import { TaskService } from '../../../services/task';

@Component({
  selector: 'app-drink-screen',
  standalone: true,
  imports: [UpperCasePipe],
  templateUrl: './drink-screen.html',
  styleUrl: './drink-screen.scss',
})
export class DrinkScreen implements OnInit {
  gameId  = '';
  roundId = '';
  team    = '';
  taskId  = '';
  taskLabel = '';
  fallbackDrinkCount = 0;

  drinksToShow: (GeneratedDrinkEntry & {
    drink_parts_named: { name: string; amount: number }[];
  })[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roundService: RoundService,
    private drinkGenerator: DrinkGeneratorService,
    private roundDrinkService: RoundDrinkService,
    private roundPlayerService: RoundPlayerService,
    private taskService: TaskService
  ) {}

  async ngOnInit() {
    this.gameId  = this.route.snapshot.paramMap.get('gameId')  ?? '';
    this.roundId = this.route.snapshot.paramMap.get('roundId') ?? '';
    this.team    = this.route.snapshot.paramMap.get('team')    ?? '';
    this.taskId  = this.route.snapshot.paramMap.get('taskId')  ?? '';

    const [players, task] = await Promise.all([
      this.roundPlayerService.getPlayersByRound(this.roundId),
      this.taskId ? this.taskService.getTaskById(this.taskId) : Promise.resolve(null),
    ]);

    this.taskLabel = task?.label ?? '';

    const numPlayers = players.filter(p => p.team === this.team).length;

    if (numPlayers === 0) return;

    let min: number, max: number;
    if (numPlayers <= 2) {
      min = max = 1;
    } else {
      min = Math.max(2, Math.floor(Math.pow(numPlayers, 0.9) * 0.3));
      max = Math.ceil(Math.pow(numPlayers, 0.95) * 0.55);
      const half = Math.floor(numPlayers / 2);
      if (max > half) max = half;
      if (min > half) min = half;
    }

    const drinkCount = Math.floor(Math.random() * (max - min + 1)) + min;
    const selected: GeneratedDrinkEntry[] = [];
    for (let i = 0; i < drinkCount; i++) {
      const drink = await this.drinkGenerator.getRandomGeneratedDrink(this.roundId);
      if (drink) selected.push(drink);
    }

    this.drinksToShow = await Promise.all(selected.map(async drink => {
      const drink_parts_named = await Promise.all(
        drink.drink_parts.map(async part => {
          const rd = await this.roundDrinkService.getRoundDrinkById(part.id);
          return { name: rd?.drink_name ?? 'Unbekannt', amount: part.amount };
        })
      );
      return { ...drink, drink_parts_named };
    }));

    if (this.drinksToShow.length === 0) {
      this.fallbackDrinkCount = Math.floor(Math.random() * (max - min + 1)) + min;
    }
  }

  toTenthFraction(value: number): string {
    return `${Math.round(value * 10)}/10`;
  }

  async navigateToCountdown() {
    for (const drink of this.drinksToShow) {
      await this.drinkGenerator.deleteGeneratedDrinkById(drink.id!);
    }
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'countdown', this.team, this.taskId]);
  }

  protected readonly Math = Math;
}
