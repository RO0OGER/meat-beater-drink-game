import {Component} from '@angular/core';
import {LottieComponent} from 'ngx-lottie';
import {Router} from '@angular/router';

@Component({
  selector: 'app-start-screen',
  imports: [
    LottieComponent

  ],
  templateUrl: './start-screen.html',
  styleUrl: './start-screen.scss'
})
export class StartScreen{
  lottieOptions = {
    path: 'assets/lottie/your-animation.json',
    renderer: 'svg' as const,
    loop: true,
    autoplay: true,
  };
  constructor(private router: Router) {}

  startGame() {
    this.router.navigate(['/create-round']);
  }

  loadGame() {
    console.log('Load Game clicked');
    // Router-Navigation oder Logik
  }
}
