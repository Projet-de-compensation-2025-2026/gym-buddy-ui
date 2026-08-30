import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApi } from '../../../src/app/api/auth-api.service';
import { readApiError } from '../../../src/app/api/models';
import { AuthSession } from '../../../src/app/auth/auth-session.service';

@Component({
  selector: 'admin-login',
  imports: [ReactiveFormsModule],
  template: `
    <section class="card">
      <h1>Admin Portal</h1>
      <p class="muted">Staff sign-in. Members cannot use this console.</p>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Email <input type="email" formControlName="email" autocomplete="username" /></label>
        <label
          >Password
          <input type="password" formControlName="password" autocomplete="current-password"
        /></label>
        <button class="btn-primary" type="submit" [disabled]="submitting()">
          {{ submitting() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </section>
  `,
  styles: `
    .card {
      max-width: 24rem;
      margin: 4rem auto;
      background: #fff;
      border: 1px solid #e5e7e9;
      border-radius: 0.5rem;
      padding: 1.5rem;
      display: grid;
      gap: 0.75rem;
    }
    form,
    label {
      display: grid;
      gap: 0.35rem;
    }
    .btn-primary {
      background: #006d77;
      color: #fff;
      border: 0;
      border-radius: 0.25rem;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
    }
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Enter a valid email and password.');
      return;
    }
    this.submitting.set(true);
    this.api.login(this.form.getRawValue()).subscribe({
      next: (tokens) => {
        this.session.setAccessToken(tokens.accessToken);
        this.submitting.set(false);
        if (!this.session.isStaff()) {
          this.session.clear();
          this.error.set('Staff accounts only.');
          return;
        }
        void this.router.navigateByUrl('/users');
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(readApiError(err));
      },
    });
  }
}
