import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventsApi } from '../../api/events-api.service';
import { MediaApi } from '../../api/media-api.service';
import { readApiError } from '../../api/models';
import type { GetEvents200DataItem, GetEventsKind } from '../../api/generated/model';

@Component({
  selector: 'app-events',
  imports: [RouterLink],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css',
})
export class EventsPage {
  private readonly api = inject(EventsApi);
  private readonly media = inject(MediaApi);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly kind = signal<GetEventsKind | ''>('');
  readonly events = signal<GetEvents200DataItem[]>([]);
  readonly coverUrls = signal<Record<string, string>>({});
  readonly next = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  setKind(kind: GetEventsKind | ''): void {
    this.kind.set(kind);
    this.reload();
  }

  reload(append = false): void {
    this.loading.set(true);
    this.error.set(null);
    const kind = this.kind();
    this.api
      .list({
        kind: kind || undefined,
        size: 50,
        after: append ? (this.next() ?? undefined) : undefined,
      })
      .subscribe({
        next: (page) => {
          this.events.set(append ? [...this.events(), ...page.data] : page.data);
          this.next.set(page.page.next ?? null);
          this.loading.set(false);
          this.loadCovers(page.data);
        },
        error: (err: unknown) => {
          this.error.set(readApiError(err));
          this.loading.set(false);
        },
      });
  }

  spots(event: GetEvents200DataItem): string {
    if (event.remainingSeats <= 0) {
      return 'Full';
    }
    return `${event.remainingSeats} spot${event.remainingSeats === 1 ? '' : 's'} left`;
  }

  clockTime(iso: string): string {
    return new Date(iso).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  initials(event: GetEvents200DataItem): string {
    const source = event.organizer.displayName || event.organizer.handle;
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private loadCovers(rows: GetEvents200DataItem[]): void {
    for (const row of rows) {
      const mediaId = row.coverMediaId;
      if (!mediaId || this.coverUrls()[mediaId]) {
        continue;
      }
      this.media.url(mediaId).subscribe({
        next: (signed) => this.coverUrls.update((urls) => ({ ...urls, [mediaId]: signed.url })),
        error: () => undefined,
      });
    }
  }
}
