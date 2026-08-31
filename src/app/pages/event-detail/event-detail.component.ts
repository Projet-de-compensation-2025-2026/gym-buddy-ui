import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthSession } from '../../auth/auth-session.service';
import { EventsApi } from '../../api/events-api.service';
import { MediaApi } from '../../api/media-api.service';
import { readApiError } from '../../api/models';
import type {
  GetEventsId200,
  GetEventsId200PendingApplicantsItem,
} from '../../api/generated/model';

@Component({
  selector: 'app-event-detail',
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.css',
})
export class EventDetailPage {
  private readonly api = inject(EventsApi);
  private readonly media = inject(MediaApi);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(AuthSession);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly event = signal<GetEventsId200 | null>(null);
  readonly coverUrl = signal<string | null>(null);
  readonly busy = signal(false);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.load(id);
    } else {
      this.loading.set(false);
      this.error.set('Event not found');
    }
  }

  get organizerView(): boolean {
    const event = this.event();
    const handle = this.session.handle();
    return !!event && !!handle && event.organizer.handle === handle;
  }

  spotsLabel(remaining: number, cancelled = false): string {
    if (cancelled) {
      return 'Cancelled';
    }
    if (remaining <= 0) {
      return 'Full';
    }
    return `${remaining} spot${remaining === 1 ? '' : 's'} left`;
  }

  seriesCancelled(event: GetEventsId200): boolean {
    if (event.cancelledAt) {
      return true;
    }
    return event.occurrences.length > 0 && event.occurrences.every((row) => row.cancelled);
  }

  canCancelOccurrence(event: GetEventsId200, row: GetEventsId200['occurrences'][number]): boolean {
    return (
      this.organizerView &&
      !event.cancelledAt &&
      !row.cancelled &&
      new Date(row.startsAt).getTime() > Date.now()
    );
  }

  apply(): void {
    const event = this.event();
    if (!event) {
      return;
    }
    this.run(() => this.api.apply(event.id, occurrenceBody(event)));
  }

  withdraw(): void {
    const applicationId = this.event()?.viewerApplication?.id;
    if (!applicationId) {
      return;
    }
    this.run(() => this.api.withdraw(applicationId));
  }

  accept(row: GetEventsId200PendingApplicantsItem): void {
    this.run(() => this.api.accept(row.application.id));
  }

  decline(row: GetEventsId200PendingApplicantsItem): void {
    this.run(() => this.api.decline(row.application.id));
  }

  cancelSeries(): void {
    const event = this.event();
    if (!event) {
      return;
    }
    this.run(() => this.api.cancel(event.id));
  }

  cancelOccurrence(occurrenceId: string): void {
    const event = this.event();
    if (!event) {
      return;
    }
    this.run(() => this.api.cancel(event.id, { occurrenceId }));
  }

  when(iso: string): string {
    return new Date(iso).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get(id).subscribe({
      next: (event) => {
        this.event.set(event);
        this.loading.set(false);
        if (event.coverMediaId) {
          this.media.url(event.coverMediaId).subscribe({
            next: (signed) => this.coverUrl.set(signed.url),
            error: () => undefined,
          });
        }
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.loading.set(false);
      },
    });
  }

  private run(request: () => Observable<unknown>): void {
    const event = this.event();
    if (!event) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    request().subscribe({
      next: () => {
        this.busy.set(false);
        this.load(event.id);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }
}

function occurrenceBody(event: GetEventsId200): { occurrenceId: string } | undefined {
  if (event.kind === 'instant') {
    return undefined;
  }
  const next = event.occurrences.find(
    (row) => !row.cancelled && new Date(row.startsAt).getTime() > Date.now(),
  );
  return next ? { occurrenceId: next.id } : undefined;
}
