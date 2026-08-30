import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProfilesApi } from '../../api/profiles-api.service';
import { readApiError } from '../../api/models';
import type { GetProfilesHandle200 } from '../../api/generated/model';
import { AuthSession } from '../../auth/auth-session.service';

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfilePage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ProfilesApi);
  protected readonly session = inject(AuthSession);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly profile = signal<GetProfilesHandle200 | null>(null);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const handle = params.get('handle');
      if (!handle) {
        this.error.set('Profile not found.');
        this.loading.set(false);
        return;
      }
      this.load(handle);
    });
  }

  load(handle: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.profile.set(null);
    this.api.byHandle(handle).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.loading.set(false);
      },
    });
  }

  initials(profile: GetProfilesHandle200): string {
    const source = profile.displayName || profile.handle;
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  windowsLabel(profile: GetProfilesHandle200): string {
    const windows = profile.preferredWindows ?? [];
    if (windows.length === 0) {
      return 'Flexible';
    }
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return windows
      .map((window) => `${days[window.weekday] ?? window.weekday} ${window.start}–${window.end}`)
      .join(', ');
  }

  isOwner(profile: GetProfilesHandle200): boolean {
    return this.session.handle()?.toLowerCase() === profile.handle.toLowerCase();
  }
}
