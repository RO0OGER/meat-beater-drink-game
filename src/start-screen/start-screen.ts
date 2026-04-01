import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-start-screen',
  standalone: true,
  imports: [],
  templateUrl: './start-screen.html',
  styleUrl: './start-screen.scss',
})
export class StartScreen {
  constructor(private router: Router) {}

  play() {
    this.router.navigate(['/dashboard']);
  }

  openAccount() {
    this.router.navigate(['/login']);
  }

  openImpressum() {
    this.router.navigate(['/impressum']);
  }
}
