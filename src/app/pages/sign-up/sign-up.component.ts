import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApi } from '../../api/auth-api.service';
import { readApiError } from '../../api/models';
import { fsAcct03PasswordValidator } from '../../auth/password-rules';

@Component({
  selector: 'app-sign-up',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.css',
})
export class SignUpPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      handle: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(10)]],
      displayName: ['', Validators.required],
    },
    { validators: fsAcct03PasswordValidator('email', 'handle', 'password') },
  );

  submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(
        'Check email, handle, password (10+ characters, not email or handle), and display name.',
      );
      return;
    }
    this.submitting.set(true);
    this.api.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigateByUrl('/login', { state: { registered: true } });
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(readApiError(err));
      },
    });
  }
}
