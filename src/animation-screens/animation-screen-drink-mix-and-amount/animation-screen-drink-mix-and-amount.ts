import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-animation-screen-drink-mix-and-amount',
  standalone: true,
  imports: [],
  templateUrl: './animation-screen-drink-mix-and-amount.html',
  styleUrl: './animation-screen-drink-mix-and-amount.scss',
})
export class AnimationScreenDrinkMixAndAmount implements OnInit {
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const team    = this.route.snapshot.paramMap.get('team')    ?? '';
    const gameId  = this.route.snapshot.paramMap.get('gameId')  ?? '';
    const roundId = this.route.snapshot.paramMap.get('roundId') ?? '';
    const taskId  = this.route.snapshot.paramMap.get('taskId')  ?? '';

    setTimeout(() => {
      this.router.navigate(['/game', gameId, 'round', roundId, 'drink', team, taskId]);
    }, 2110);
  }
}
