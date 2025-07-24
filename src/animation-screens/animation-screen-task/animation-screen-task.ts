import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-animation-screen-task',
  templateUrl: './animation-screen-task.html',
  styleUrl: './animation-screen-task.scss',
  standalone: true,
  imports: [],
})
export class AnimationScreenTask implements OnInit {
  roundCode = '';
  team = '';

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';
    this.team = this.route.snapshot.paramMap.get('team') ?? '';

    setTimeout(() => {
      this.router.navigate(['/task', this.team, this.roundCode]);
    }, 5000);
  }
}
