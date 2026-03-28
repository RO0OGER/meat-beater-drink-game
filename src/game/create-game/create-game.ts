import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-create-game',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './create-game.html',
  styleUrl: './create-game.scss',
})
export class CreateGamePage {
  form: FormGroup;
  creating = false;

  constructor(
    private fb: FormBuilder,
    private gameService: GameService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  async create() {
    if (this.form.invalid) return;
    this.creating = true;

    const game = await this.gameService.createGame(this.form.value.name);

    if (game) {
      this.router.navigate(['/game', game.id]);
    }
    this.creating = false;
  }

  back() {
    this.router.navigate(['/dashboard']);
  }
}
