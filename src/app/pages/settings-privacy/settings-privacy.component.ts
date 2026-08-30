import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApi } from '../../api/auth-api.service';
import { ProfilesApi } from '../../api/profiles-api.service';
import { readApiError } from '../../api/models';
import { AuthSession } from '../../auth/auth-session.service';
import { PasswordField } from '../../auth/password-field';
import { passwordMeetsFsAcct03 } from '../../auth/password-rules';

@Component({
  selector: 'app-settings-privacy',
  imports: [ReactiveFormsModule, RouterLink, PasswordField],
  templateUrl: './settings-privacy.component.html',
  styleUrl: './settings-privacy.component.css',
})
export class SettingsPrivacyPage {
  private readonly fb = inject(FormBuilder);
  private readonly profiles = inject(ProfilesApi);
  private readonly auth = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly visibility = signal<'public' | 'private'>('public');
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly passwordBusy = signal(false);
  readonly closeBusy = signal(false);

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(10)]],
    confirmPassword: ['', Validators.required],
  });

  readonly closeForm = this.fb.nonNullable.group({
    password: ['', Validators.required],
  });

  constructor() {
    this.profiles.me().subscribe({
      next: (profile) => {
        this.visibility.set(profile.visibility);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.loading.set(false);
      },
    });
  }

  setVisibility(value: 'public' | 'private'): void {
    this.error.set(null);
    this.profiles.patchMe({ visibility: value }).subscribe({
      next: (profile) => {
        this.visibility.set(profile.visibility);
        this.notice.set('Visibility updated.');
      },
      error: (err: unknown) => this.error.set(readApiError(err)),
    });
  }

  updatePassword(): void {
    this.error.set(null);
    this.notice.set(null);
    const value = this.passwordForm.getRawValue();
    if (this.passwordForm.invalid || value.newPassword !== value.confirmPassword) {
      this.passwordForm.markAllAsTouched();
      this.error.set('Enter current and matching new passwords (10+ characters).');
      return;
    }
    const handle = this.session.handle() ?? '';
    if (!passwordMeetsFsAcct03(value.newPassword, '', handle)) {
      this.error.set('New password must be at least 10 characters and must not equal your handle.');
      return;
    }
    this.passwordBusy.set(true);
    this.auth
      .changePassword({ currentPassword: value.currentPassword, newPassword: value.newPassword })
      .subscribe({
        next: () => {
          this.passwordBusy.set(false);
          this.session.clear();
          void this.router.navigateByUrl('/login');
        },
        error: (err: unknown) => {
          this.passwordBusy.set(false);
          this.error.set(readApiError(err));
        },
      });
  }

  closeAccount(): void {
    this.error.set(null);
    const password = this.closeForm.controls.password.value;
    if (!password) {
      this.closeForm.markAllAsTouched();
      this.error.set('Enter your password to close the account.');
      return;
    }
    this.closeBusy.set(true);
    this.auth.closeAccount({ password }).subscribe({
      next: () => {
        this.closeBusy.set(false);
        this.session.clear();
        void this.router.navigateByUrl('/login');
      },
      error: (err: unknown) => {
        this.closeBusy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }
}
