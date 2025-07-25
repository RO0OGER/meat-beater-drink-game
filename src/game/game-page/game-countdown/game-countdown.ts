import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoundService } from '../../../services/round';
import { TaskService } from '../../../services/task';
import { Task } from '../../../model/Task';

@Component({
  selector: 'app-game-countdown',
  standalone: true,
  templateUrl: './game-countdown.html',
  styleUrl: './game-countdown.scss',
})
export class GameCountdown implements OnInit, OnDestroy {
  roundCode = '';
  team: 'team1' | 'team2' = 'team1';
  remainingSeconds = 0;
  intervalId: any;
  taskId = '';
  currentTask: Task | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roundService: RoundService,
    private taskService: TaskService
  ) {}

  async ngOnInit(): Promise<void> {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';
    const teamParam = this.route.snapshot.paramMap.get('team') ?? 'team1';
    this.team = teamParam === 'team2' ? 'team2' : 'team1';
    this.taskId = this.route.snapshot.paramMap.get('task_id') ?? '';

    if (!this.roundCode) {
      console.error('Fehlender round-code in der URL');
      return;
    }

    this.remainingSeconds =
      (await this.roundService.getRemainingTimeByCode(this.roundCode, this.team)) ?? 0;

    this.currentTask = await this.taskService.getTaskById(this.taskId);

    this.startCountdown();
  }

  startCountdown() {
    this.intervalId = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
      } else {
        this.finished();
      }
    }, 1000);
  }

  async finishTask() {
    clearInterval(this.intervalId);

    await this.roundService.setRemainingTimeByCode(this.roundCode, this.team, this.remainingSeconds);

    this.router.navigate(['/game', this.roundCode]);
  }

  async finished() {
    clearInterval(this.intervalId);

    await this.roundService.setRemainingTimeByCode(this.roundCode, this.team, this.remainingSeconds);

    // ⛳️ Neue Route mit `/round-end/:team/:round_code`
    this.router.navigate(['/round-end', this.team, this.roundCode]);
  }

  get minutes(): string {
    return Math.floor(this.remainingSeconds / 60).toString().padStart(2, '0');
  }

  get seconds(): string {
    return (this.remainingSeconds % 60).toString().padStart(2, '0');
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }

  skipManually() {
    this.finishTask();
  }
}
