import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApi } from '../../../src/app/api/auth-api.service';
import { readApiError } from '../../../src/app/api/models';
import { AuthSession } from '../../../src/app/auth/auth-session.service';
import { PasswordField } from '../../../src/app/auth/password-field';

const FIXTURE_EMAIL_DOMAIN = '@fixtures.gym.test';

export function staffLoginEmail(identifier: string): string {
  const value = identifier.trim();
  if (value.includes('@')) {
    return value;
  }
  return `${value.toLowerCase()}${FIXTURE_EMAIL_DOMAIN}`;
}

@Component({
  selector: 'admin-login',
  imports: [ReactiveFormsModule, PasswordField],
  template: `
    <section class="card">
      <h1>Admin Portal</h1>
      <p class="muted">
        Staff sign-in with email or handle. Fixture accounts:
        <code>demo.admin</code> / <code>demo.admin@fixtures.gym.test</code>. Members cannot use this
        console.
      </p>
      @if (error()) {
        <p class="error" role="alert" data-testid="admin-login-error">{{ error() }}</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label
          >Email or handle
          <input
            type="text"
            formControlName="identifier"
            autocomplete="username"
            data-testid="admin-login-identifier"
        /></label>
        <label>
          Password
          <app-password-field
            [control]="form.controls.password"
            autocomplete="current-password"
            testId="admin-login-password"
          />
        </label>
        <button class="btn-primary" type="submit" [disabled]="submitting()">
          {{ submitting() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </section>
  `,
  styles: `
    .card {
      max-width: 24rem;
      width: min(24rem, 100%);
      min-width: 0;
      margin: 4rem auto;
      background: #fff;
      border: 1px solid #e5e7e9;
      border-radius: 0.5rem;
      padding: 1.5rem;
      display: grid;
      gap: 0.75rem;
      box-sizing: border-box;
    }
    form,
    label {
      display: grid;
      gap: 0.35rem;
      min-width: 0;
    }
    input {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
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
    identifier: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Enter your staff email or handle, and password.');
      return;
    }
    const { identifier, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.api.login({ email: staffLoginEmail(identifier), password }).subscribe({
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
