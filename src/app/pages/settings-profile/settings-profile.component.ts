import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, filter, of, switchMap, take, throwError, timer } from 'rxjs';
import {
  MAX_MEDIA_BYTES,
  MediaApi,
  imageMime,
  rejectIfTooLarge,
} from '../../api/media-api.service';
import { ProfilesApi } from '../../api/profiles-api.service';
import { readApiError } from '../../api/models';
import type { GetMediaIdUrl200, GetProfilesMe200 } from '../../api/generated/model';

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
  private readonly media = inject(MediaApi);
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly sportDraft = signal('');
  readonly sports = signal<string[]>([]);
  readonly catalog = SPORTS;
  readonly avatarUrl = signal<string | null>(null);
  readonly avatarMediaId = signal<string | null>(null);
  readonly maxBytesLabel = '8 MiB';
  readonly maxBytes = MAX_MEDIA_BYTES;

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

  openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      this.uploadAvatar(file);
    }
  }

  uploadAvatar(file: File): void {
    this.error.set(null);
    this.notice.set(null);
    const oversized = rejectIfTooLarge(file);
    if (oversized) {
      oversized.subscribe({ error: (err: unknown) => this.error.set(readApiError(err)) });
      return;
    }
    const mime = imageMime(file);
    if (!mime) {
      this.error.set('Use a JPEG, PNG, or WebP image.');
      return;
    }
    this.uploading.set(true);
    this.media
      .create({ kind: 'avatar', mime, bytes: file.size })
      .pipe(
        switchMap((created) =>
          this.media
            .putBytes(created.uploadUrl, file)
            .pipe(switchMap(() => this.waitReady(created.mediaId))),
        ),
        switchMap((mediaId) => this.api.patchMe({ avatarMediaId: mediaId })),
      )
      .subscribe({
        next: (profile) => {
          this.hydrate(profile);
          this.uploading.set(false);
          this.notice.set('Profile photo updated.');
        },
        error: (err: unknown) => {
          this.uploading.set(false);
          this.error.set(readApiError(err));
        },
      });
  }

  removeAvatar(): void {
    if (!this.avatarMediaId()) {
      return;
    }
    this.error.set(null);
    this.notice.set(null);
    this.uploading.set(true);
    this.api.patchMe({ avatarMediaId: null }).subscribe({
      next: (profile) => {
        this.hydrate(profile);
        this.uploading.set(false);
        this.notice.set('Profile photo removed.');
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        this.error.set(readApiError(err));
      },
    });
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

  initials(): string {
    const value = this.form.getRawValue();
    const source = value.displayName || value.handle;
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private waitReady(mediaId: string) {
    return timer(0, 400).pipe(
      take(25),
      switchMap(() => this.media.url(mediaId).pipe(catchError(() => of(null)))),
      filter((signed): signed is GetMediaIdUrl200 => signed !== null),
      take(1),
      switchMap((signed) => {
        this.avatarUrl.set(signed.url);
        return of(mediaId);
      }),
      catchError(() =>
        throwError(() => new Error('Photo is still processing. Try again in a moment.')),
      ),
    );
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
    this.avatarMediaId.set(profile.avatarMediaId ?? null);
    this.loading.set(false);
    if (!profile.avatarMediaId) {
      this.avatarUrl.set(null);
      return;
    }
    this.media.url(profile.avatarMediaId).subscribe({
      next: (signed) => this.avatarUrl.set(signed.url),
      error: () => this.avatarUrl.set(null),
    });
  }
}
