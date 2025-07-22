import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RoundService } from '../../services/round';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-round',
  templateUrl: './create-round.html',
  styleUrl: './create-round.scss',
  standalone: true,
  imports: [ReactiveFormsModule]
})
export class CreateRound {
  form: FormGroup;
  codeAvailable: boolean | null = null;
  creating = false;

  constructor(
    private fb: FormBuilder,
    private roundService: RoundService,
    private router: Router
  ) {
    this.form = this.fb.group({
      round_code: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          this.codeFormatValidator
        ]
      ],
      num_players_team1: [1, [Validators.required, Validators.min(1)]],
      num_players_team2: [1, [Validators.required, Validators.min(1)]],
      time_team1: [60, [Validators.required, Validators.min(10)]],
      time_team2: [60, [Validators.required, Validators.min(10)]],
    });
  }

  codeFormatValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    const isValid = /^[a-zA-Z0-9_-]+$/.test(value);
    return isValid ? null : { invalidFormat: true };
  }

  async checkCode() {
    const control = this.form.get('round_code');
    const code = control?.value;
    if (!code || control?.invalid) return;

    const existing = await this.roundService.getRoundByCode(code);
    this.codeAvailable = !existing;
  }

  async createGame() {
    if (this.form.invalid || this.codeAvailable === false) return;

    this.creating = true;

    const success = await this.roundService.createRound(
      this.form.value.round_code,
      this.form.value.num_players_team1,
      this.form.value.num_players_team2,
      this.form.value.time_team1,
      this.form.value.time_team2
    );

    if (success) {
      this.router.navigate(['/add-drinks', this.form.value.round_code]);
    }

    this.creating = false;
  }
}
