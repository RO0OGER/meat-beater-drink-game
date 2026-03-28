import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-animation-screen-start-round',
  standalone: true,
  imports: [],
  templateUrl: './animation-screen-start-round.html',
  styleUrl: './animation-screen-start-round.scss',
})
export class AnimationScreenStartRound implements OnInit {
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const gameId  = this.route.snapshot.paramMap.get('gameId')  ?? '';
    const roundId = this.route.snapshot.paramMap.get('roundId') ?? '';

    setTimeout(() => {
      this.router.navigate(['/game', gameId, 'round', roundId, 'play']);
    }, 2160);
  }
}
