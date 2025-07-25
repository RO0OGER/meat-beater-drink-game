import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {StartScreen} from '../game/start-screen/start-screen';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, StartScreen],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('meat-beater-drinking-game');
}
