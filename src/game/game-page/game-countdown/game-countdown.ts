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
  gameId  = '';
  roundId = '';
  team: 'team1' | 'team2' = 'team1';
  taskId  = '';
  currentTask: Task | null = null;
  remainingSeconds = 0;
  private intervalId: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roundService: RoundService,
    private taskService: TaskService
  ) {}

  async ngOnInit() {
    this.gameId  = this.route.snapshot.paramMap.get('gameId')  ?? '';
    this.roundId = this.route.snapshot.paramMap.get('roundId') ?? '';
    this.taskId  = this.route.snapshot.paramMap.get('taskId')  ?? '';
    const t = this.route.snapshot.paramMap.get('team') ?? 'team1';
    this.team = t === 'team2' ? 'team2' : 'team1';

    const round = await this.roundService.getRoundById(this.roundId);
    this.remainingSeconds = this.team === 'team1'
      ? (round?.remaining_time_team1 ?? 0)
      : (round?.remaining_time_team2 ?? 0);

    if (this.taskId && this.taskId !== 'none') {
      this.currentTask = await this.taskService.getTaskById(this.taskId);
    }

    this.startCountdown();
  }

  startCountdown() {
    this.intervalId = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
      } else {
        this.onTimeUp();
      }
    }, 1000);
  }

  async finishTask() {
    clearInterval(this.intervalId);
    await this.roundService.setRemainingTime(this.roundId, this.team, this.remainingSeconds);
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'play']);
  }

  async onTimeUp() {
    clearInterval(this.intervalId);
    await this.roundService.setRemainingTime(this.roundId, this.team, 0);
    this.router.navigate(['/game', this.gameId, 'round', this.roundId, 'end', this.team]);
  }

  get minutes(): string { return Math.floor(this.remainingSeconds / 60).toString().padStart(2, '0'); }
  get seconds(): string { return (this.remainingSeconds % 60).toString().padStart(2, '0'); }

  ngOnDestroy() { clearInterval(this.intervalId); }
}
