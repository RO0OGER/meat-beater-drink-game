import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-animation-screen-hit',
  standalone: true,
  imports: [],
  templateUrl: './animation-screen-hit.html',
  styleUrl: './animation-screen-hit.scss',
})
export class AnimationScreenHit implements OnInit {
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const team    = this.route.snapshot.paramMap.get('team')    ?? '';
    const gameId  = this.route.snapshot.paramMap.get('gameId')  ?? '';
    const roundId = this.route.snapshot.paramMap.get('roundId') ?? '';

    setTimeout(() => {
      this.router.navigate(['/game', gameId, 'round', roundId, 'hit', team]);
    }, 2500);
  }
}
