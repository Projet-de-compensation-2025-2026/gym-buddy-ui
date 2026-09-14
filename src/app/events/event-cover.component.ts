import { Component, effect, inject, model, signal } from '@angular/core';
import { map, switchMap } from 'rxjs';
import { MediaApi, imageMime, MAX_MEDIA_BYTES } from '../api/media-api.service';
import { readApiError } from '../api/models';

@Component({
  selector: 'app-event-cover',
  template: `
    <div class="cover-picker">
      <label
        >Event cover (optional)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          [disabled]="uploading()"
          (change)="choose($event)"
        />
      </label>
      <small>JPG, PNG or WebP, up to 8 MiB.</small>
      @if (uploading()) {
        <p role="status">Uploading cover…</p>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @if (preview(); as url) {
        <img [src]="url" alt="Event cover preview" />
      }
    </div>
  `,
  styles: `
    .cover-picker {
      display: grid;
      gap: 0.4rem;
      min-width: 0;
    }
    img {
      width: 100%;
      max-height: 12rem;
      object-fit: cover;
      border-radius: 0.5rem;
    }
    small {
      color: #6e7174;
    }
    input {
      max-width: 100%;
    }
  `,
})
export class EventCover {
  private readonly media = inject(MediaApi);
  readonly mediaId = model<string | null>(null);
  readonly uploading = model(false);
  readonly preview = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.mediaId();
      if (!id) {
        this.preview.set(null);
        return;
      }
      this.media
        .url(id)
        .subscribe({
          next: (signed) => this.preview.set(signed.url),
          error: () => this.preview.set(null),
        });
    });
  }

  choose(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.uploading()) return;
    const mime = imageMime(file);
    if (!mime || file.size < 1 || file.size > MAX_MEDIA_BYTES) {
      this.error.set('Choose a JPG, PNG or WebP image no larger than 8 MiB.');
      return;
    }
    this.error.set(null);
    this.uploading.set(true);
    this.media
      .create({ kind: 'event', mime, bytes: file.size })
      .pipe(
        switchMap((created) =>
          this.media.putBytes(created.uploadUrl, file).pipe(
            switchMap(() => this.media.waitReady(created.mediaId)),
            map(() => created.mediaId),
          ),
        ),
      )
      .subscribe({
        next: (id) => {
          this.mediaId.set(id);
          this.uploading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(err instanceof Error ? err.message : readApiError(err));
          this.uploading.set(false);
        },
      });
  }
}
