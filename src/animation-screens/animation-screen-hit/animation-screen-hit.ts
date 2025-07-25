import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-animation-screen-hit',
  imports: [],
  templateUrl: './animation-screen-hit.html',
  styleUrl: './animation-screen-hit.scss'
})
export class AnimationScreenHit implements OnInit {
  roundCode = '';
  team = '';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.roundCode = this.route.snapshot.paramMap.get('round_code') ?? '';
    this.team = this.route.snapshot.paramMap.get('team') ?? '';

    setTimeout(() => {
      this.router.navigate([`/hit-${this.team}`, this.roundCode]);
    }, 2500);
  }
}
