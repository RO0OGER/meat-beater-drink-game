import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-animation-screen-start-round',
  imports: [],
  templateUrl: './animation-screen-start-round.html',
  styleUrl: './animation-screen-start-round.scss'
})
export class AnimationScreenStartRound implements OnInit{
  roundCode = '';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';

    setTimeout(() => {
      this.router.navigate(['/game', this.roundCode]);
    }, 2160);
  }
}
