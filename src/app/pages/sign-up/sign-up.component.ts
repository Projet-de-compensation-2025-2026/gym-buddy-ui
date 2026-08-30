import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApi } from '../../api/auth-api.service';
import { clientRegisterErrors, mapAuthApiError, type AuthField } from '../../auth/auth-errors';
import { PasswordField } from '../../auth/password-field';
import { fsAcct03PasswordValidator } from '../../auth/password-rules';

@Component({
  selector: 'app-sign-up',
  imports: [ReactiveFormsModule, RouterLink, PasswordField],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.css',
})
export class SignUpPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly fieldErrors = signal<Partial<Record<AuthField, string>>>({});

  readonly form = this.fb.nonNullable.group(
    {
      displayName: ['', Validators.required],
      handle: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(10)]],
    },
    { validators: fsAcct03PasswordValidator('email', 'handle', 'password') },
  );

  fieldError(name: AuthField): string | null {
    return this.fieldErrors()[name] ?? null;
  }

  submit(): void {
    this.error.set(null);
    this.fieldErrors.set({});
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.fieldErrors.set(clientRegisterErrors(this.form));
      return;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue();
    this.api.register(value).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigate(['/login'], {
          queryParams: { registered: '1', email: value.email },
          state: { registered: true, email: value.email },
        });
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
