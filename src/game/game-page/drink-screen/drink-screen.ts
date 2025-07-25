import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoundService } from '../../../services/round';
import { GeneratedDrinkEntry } from '../../../model/GeneratedDrinkEntry';
import { DrinkGeneratorService } from '../../../services/generate-drink';
import { RoundDrinkService } from '../../../services/round-drink.service';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { TaskService } from '../../../services/task';

@Component({
  selector: 'app-drink-screen',
  standalone: true,
  imports: [UpperCasePipe, DecimalPipe],
  templateUrl: './drink-screen.html',
  styleUrl: './drink-screen.scss'
})
export class DrinkScreen implements OnInit {
  roundCode = '';
  taskId = '';
  team = '';
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
    private taskService: TaskService
  ) {}

  async ngOnInit(): Promise<void> {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';
    this.taskId = this.route.snapshot.paramMap.get('task_id') ?? '';
    this.team = this.route.snapshot.paramMap.get('team') ?? '';

    const roundId = await this.roundService.getIdByRoundCode(this.roundCode);
    if (!roundId) return;

    if (this.taskId) {
      const task = await this.taskService.getTaskById(this.taskId);
      this.taskLabel = task?.label ?? 'Unbekannte Aufgabe';
    }

    let numPlayers = 0;
    if (this.team === 'team1') {
      numPlayers = await this.roundService.getNumPlayersTeam1(roundId) ?? 0;
    } else if (this.team === 'team2') {
      numPlayers = await this.roundService.getNumPlayersTeam2(roundId) ?? 0;
    }

    if (numPlayers === 0) return;

    let min: number;
    let max: number;

    if (numPlayers <= 2) {
      min = 1;
      max = 1;
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
      const drink = await this.drinkGenerator.getRandomGeneratedDrink(roundId);
      if (drink) selected.push(drink);
    }

    this.drinksToShow = await Promise.all(selected.map(async (drink) => {
      const drink_parts_named = await Promise.all(
        drink.drink_parts.map(async (part) => {
          const rd = await this.roundDrinkService.getRoundDrinkById(part.id);
          return {
            name: rd?.drink_name ?? 'Unbekannt',
            amount: part.amount
          };
        })
      );

      return { ...drink, drink_parts_named };
    }));

    // Fallback-Logik, falls keine Drinks generiert wurden
    if (this.drinksToShow.length === 0) {
      let fallbackMin = min;
      let fallbackMax = max;
      if (fallbackMin > fallbackMax) fallbackMin = fallbackMax;
      this.fallbackDrinkCount = Math.floor(Math.random() * (fallbackMax - fallbackMin + 1)) + fallbackMin;
    }
  }

  protected readonly Math = Math;

  toTenthFraction(value: number): string {
    const tenth = Math.round(value * 10);
    return `${tenth}/10`;
  }

  async navigateToCountdown() {
    for (const drink of this.drinksToShow) {
      await this.drinkGenerator.deleteGeneratedDrinkById(drink.id!);
    }

    this.router.navigate([
      '/game-countdown',
      this.team,
      this.roundCode,
      this.taskId
    ]);
  }
}
