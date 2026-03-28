import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RoundService } from '../../services/round';

@Component({
  selector: 'app-create-round',
  templateUrl: './create-round.html',
  styleUrl: './create-round.scss',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
})
export class CreateRoundPage implements OnInit {
  form: FormGroup;
  gameId = '';
  codeAvailable: boolean | null = null;
  creating = false;

  constructor(
    private fb: FormBuilder,
    private roundService: RoundService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      round_code: ['', [Validators.required, Validators.minLength(5), this.codeFormatValidator]],
      team1_name: ['Team 1', [Validators.required]],
      team2_name: ['Team 2', [Validators.required]],
      time_team1_min: [1, [Validators.required, Validators.min(1)]],
      time_team2_min: [1, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit() {
    this.gameId = this.route.snapshot.paramMap.get('gameId') ?? '';
  }

  codeFormatValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    return /^[a-zA-Z0-9_-]+$/.test(value) ? null : { invalidFormat: true };
  }

  async checkCode() {
    const control = this.form.get('round_code');
    if (!control?.value || control.invalid) return;
    this.codeAvailable = !(await this.roundService.isCodeTaken(control.value));
  }

  async createRound() {
    if (this.form.invalid || this.codeAvailable === false || !this.gameId) return;
    this.creating = true;

    const { round_code, team1_name, team2_name, time_team1_min, time_team2_min } = this.form.value;

    const round = await this.roundService.createRound(
      this.gameId,
      round_code,
      team1_name,
      team2_name,
      time_team1_min * 60,
      time_team2_min * 60
    );

    if (round) {
      this.router.navigate(['/join', round.round_code]);
    }
    this.creating = false;
  }

  back() {
    this.router.navigate(['/game', this.gameId]);
  }
}
