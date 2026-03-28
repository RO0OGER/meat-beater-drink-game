import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-animation-screen-task',
  standalone: true,
  imports: [],
  templateUrl: './animation-screen-task.html',
  styleUrl: './animation-screen-task.scss',
})
export class AnimationScreenTask implements OnInit {
  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    const team    = this.route.snapshot.paramMap.get('team')    ?? '';
    const gameId  = this.route.snapshot.paramMap.get('gameId')  ?? '';
    const roundId = this.route.snapshot.paramMap.get('roundId') ?? '';

    setTimeout(() => {
      this.router.navigate(['/game', gameId, 'round', roundId, 'task', team]);
    }, 2180);
  }
}
