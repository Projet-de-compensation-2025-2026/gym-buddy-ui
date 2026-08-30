import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthApi } from '../../api/auth-api.service';
import { clientLoginErrors, mapAuthApiError, type AuthField } from '../../auth/auth-errors';
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
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly fieldErrors = signal<Partial<Record<AuthField, string>>>({});
  readonly registered = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    const navState = this.router.getCurrentNavigation()?.extras.state ?? {};
    const query = this.route.snapshot.queryParamMap;
    const email =
      (typeof navState['email'] === 'string' ? navState['email'] : '') || query.get('email') || '';
    this.registered.set(navState['registered'] === true || query.get('registered') === '1');
    if (email) {
      this.form.controls.email.setValue(email);
    }
  }

  fieldError(name: AuthField): string | null {
    return this.fieldErrors()[name] ?? null;
  }

  submit(): void {
    this.error.set(null);
    this.fieldErrors.set({});
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.fieldErrors.set(clientLoginErrors(this.form));
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
        const mapped = mapAuthApiError(err);
        this.error.set(mapped.formError);
        this.fieldErrors.set(mapped.fieldErrors);
      },
    });
  }
}
