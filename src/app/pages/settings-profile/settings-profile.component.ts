import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProfilesApi } from '../../api/profiles-api.service';
import { readApiError } from '../../api/models';
import type { GetProfilesMe200 } from '../../api/generated/model';

const SPORTS = [
  'weightlifting',
  'running',
  'crossfit',
  'yoga',
  'hiit',
  'cycling',
  'swimming',
  'climbing',
  'martial-arts',
  'team-sports',
];

@Component({
  selector: 'app-settings-profile',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './settings-profile.component.html',
  styleUrl: './settings-profile.component.css',
})
export class SettingsProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProfilesApi);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly sportDraft = signal('');
  readonly sports = signal<string[]>([]);
  readonly catalog = SPORTS;

  readonly form = this.fb.nonNullable.group({
    displayName: ['', Validators.required],
    handle: ['', Validators.required],
    bio: [''],
    city: [''],
    experienceLevel: [''],
  });

  constructor() {
    this.api.me().subscribe({
      next: (profile) => this.hydrate(profile),
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.loading.set(false);
      },
    });
  }

  addSport(sport: string): void {
    const tag = sport.trim().toLowerCase();
    if (tag.length < 2 || tag.length > 32) {
      return;
    }
    const next = this.sports();
    if (next.includes(tag) || next.length >= 12) {
      return;
    }
    this.sports.set([...next, tag]);
    this.sportDraft.set('');
  }

  removeSport(sport: string): void {
    this.sports.set(this.sports().filter((item) => item !== sport));
  }

  save(): void {
    this.error.set(null);
    this.notice.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Display name and username are required.');
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    this.api
      .patchMe({
        displayName: value.displayName,
        handle: value.handle,
        bio: value.bio,
        city: value.city,
        experienceLevel: value.experienceLevel
          ? (value.experienceLevel as 'beginner' | 'intermediate' | 'advanced')
          : null,
        sports: this.sports(),
      })
      .subscribe({
        next: (profile) => {
          this.hydrate(profile);
          this.saving.set(false);
          this.notice.set('Profile saved.');
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.error.set(readApiError(err));
        },
      });
  }

  private hydrate(profile: GetProfilesMe200): void {
    this.form.patchValue({
      displayName: profile.displayName ?? '',
      handle: profile.handle,
      bio: profile.bio ?? '',
      city: profile.city ?? '',
      experienceLevel: profile.experienceLevel ?? '',
    });
    this.sports.set([...(profile.sports ?? [])]);
    this.loading.set(false);
  }
}
