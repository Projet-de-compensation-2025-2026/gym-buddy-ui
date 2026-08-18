import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApi } from '../../api/auth-api.service';
import { readApiError } from '../../api/models';
import { AuthSession } from '../../auth/auth-session.service';
import { PasswordField } from '../../auth/password-field';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule, RouterLink, PasswordField],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.css',
})
export class SignInPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly registered = signal(
    Boolean(this.router.lastSuccessfulNavigation()?.extras.state?.['registered']),
  );

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
        void this.router.navigateByUrl('/');
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(readApiError(err));
      },
    });
  }
}
