import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.scss',
})
export class AuthPage {
  mode: 'login' | 'register' = 'login';
  loading = false;
  errorMessage = '';

  loginForm: FormGroup;
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  switchMode(mode: 'login' | 'register') {
    this.mode = mode;
    this.errorMessage = '';
  }

  async login() {
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;
    const { error } = await this.auth.signIn(email, password);

    if (error) {
      this.errorMessage = error;
    } else {
      this.router.navigate(['/dashboard']);
    }
    this.loading = false;
  }

  async register() {
    if (this.registerForm.invalid) return;
    this.loading = true;
    this.errorMessage = '';

    const { username, email, password } = this.registerForm.value;
    const { error } = await this.auth.signUp(email, password, username);

    if (error) {
      this.errorMessage = error;
    } else {
      this.router.navigate(['/dashboard']);
    }
    this.loading = false;
  }
}
