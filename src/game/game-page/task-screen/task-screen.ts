import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TaskService } from '../../../services/task';
import { Task } from '../../../model/Task';

@Component({
  selector: 'app-task-screen',
  standalone: true,
  templateUrl: './task-screen.html',
  styleUrl: './task-screen.scss',
  imports: [],
})
export class TaskScreen implements OnInit {
  task: Task | null = null;
  gameId  = '';
  roundId = '';
  team    = '';

  constructor(
    private taskService: TaskService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.gameId  = this.route.snapshot.paramMap.get('gameId')  ?? '';
    this.roundId = this.route.snapshot.paramMap.get('roundId') ?? '';
    this.team    = this.route.snapshot.paramMap.get('team')    ?? '';
    this.task    = await this.taskService.getRandomTask();

    if (this.task) {
      setTimeout(() => {
        this.router.navigate([
          '/animation/drink',
          this.team, this.gameId, this.roundId, this.task!.id
        ]);
      }, 10000);
    }
  }
}
