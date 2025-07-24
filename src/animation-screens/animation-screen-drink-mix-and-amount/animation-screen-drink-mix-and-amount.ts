import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-animation-screen-drink-mix-and-amount',
  standalone: true,
  templateUrl: './animation-screen-drink-mix-and-amount.html',
  styleUrl: './animation-screen-drink-mix-and-amount.scss',
  imports: [],
})
export class AnimationScreenDrinkMixAndAmount implements OnInit {
  roundCode = '';
  taskId = '';
  team = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';
    this.taskId = this.route.snapshot.paramMap.get('task_id') ?? '';
    this.team = this.route.snapshot.paramMap.get('team') ?? '';

    setTimeout(() => {
      this.router.navigate(['/drink', this.team, this.roundCode, this.taskId]);
    }, 5000);
  }
}
