import { Component } from '@angular/core';
import { LottieComponent } from 'ngx-lottie';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-start-screen',
  standalone: true,
  imports: [
    LottieComponent,
    CommonModule,
    FormsModule
  ],
  templateUrl: './start-screen.html',
  styleUrl: './start-screen.scss'
})
export class StartScreen {
  lottieOptions = {
    path: 'assets/lottie/your-animation.json',
    renderer: 'svg' as const,
    loop: true,
    autoplay: true,
  };

  showInput = false;
  loadCode = '';

  constructor(private router: Router) {}

  startGame() {
    this.router.navigate(['/create-round']);
  }

  toggleLoad() {
    this.showInput = !this.showInput;
  }

  confirmLoad() {
    const code = this.loadCode.trim();
    if (code.length >= 3) {
      this.router.navigate(['/game', code]);
    } else {
      alert('❗ Bitte einen gültigen Game-Code eingeben');
    }
  }
  goToImpressum() {
    this.router.navigate(['/impressum']);
  }
}
