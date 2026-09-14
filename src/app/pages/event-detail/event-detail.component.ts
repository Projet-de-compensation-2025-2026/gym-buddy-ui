import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EventInvitees } from '../../events/event-invitees.component';
import { ReportButton } from '../../reports/report-button.component';
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
  imports: [ReactiveFormsModule, EventInvitees, ReportButton],
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.css',
})
export class EventDetailPage {
  private readonly api = inject(EventsApi);
  private readonly media = inject(MediaApi);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(AuthSession);
  private readonly fb = inject(FormBuilder);
  readonly editing = signal(false);
  readonly inviteeIds = signal<string[]>([]);
  readonly editForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(2000)],
    place: ['', [Validators.required, Validators.maxLength(200)]],
    startsAt: ['', Validators.required],
    durationMin: [60, [Validators.required, Validators.min(1), Validators.max(1440)]],
  });

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly event = signal<GetEventsId200 | null>(null);
  readonly coverUrl = signal<string | null>(null);
  readonly busy = signal(false);
  readonly selectedOccurrence = signal<string | null>(null);

  chooseOccurrence(id: string): void {
    this.selectedOccurrence.set(id);
    const event = this.event();
    if (event) this.load(event.id);
  }

  currentOccurrence(event: GetEventsId200): GetEventsId200['occurrences'][number] | undefined {
    return (
      event.occurrences.find((row) => row.id === this.selectedOccurrence()) ??
      event.occurrences.find((row) => !row.cancelled && Date.parse(row.startsAt) > Date.now()) ??
      event.occurrences[0]
    );
  }

  occurrenceUnavailable(event: GetEventsId200): boolean {
    const row = this.currentOccurrence(event);
    return !row || row.cancelled || Date.parse(row.startsAt) <= Date.now();
  }

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

  canEdit(event: GetEventsId200): boolean {
    return (
      this.organizerView && !this.seriesCancelled(event) && Date.parse(event.startsAt) > Date.now()
    );
  }

  beginEdit(): void {
    const event = this.event();
    if (!event || !this.canEdit(event)) return;
    const date = new Date(event.startsAt);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
    this.editForm.setValue({
      title: event.title,
      description: event.description ?? '',
      place: event.place,
      startsAt: local,
      durationMin: event.durationMin,
    });
    this.inviteeIds.set(event.inviteeIds ?? []);
    this.editing.set(true);
  }

  saveEdit(): void {
    const event = this.event();
    if (!event || this.editForm.invalid) {
      this.error.set('Check the event title, place, time and duration.');
      return;
    }
    const value = this.editForm.getRawValue();
    const start = new Date(value.startsAt);
    if (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now()) {
      this.error.set('Choose a start time in the future.');
      return;
    }
    this.run(
      () =>
        this.api.patch(event.id, {
          ...value,
          title: value.title.trim(),
          place: value.place.trim(),
          startsAt: start.toISOString(),
          inviteeIds: event.visibility === 'private' ? this.inviteeIds() : undefined,
        }),
      () => this.editing.set(false),
    );
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
    const row = this.currentOccurrence(event);
    if (!row || this.occurrenceUnavailable(event)) return;
    this.run(() =>
      this.api.apply(event.id, event.kind === 'recurring' ? { occurrenceId: row.id } : undefined),
    );
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
    this.api.get(id, this.selectedOccurrence() ?? undefined).subscribe({
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

  private run(request: () => Observable<unknown>, onSuccess?: () => void): void {
    const event = this.event();
    if (!event) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    request().subscribe({
      next: () => {
        this.busy.set(false);
        onSuccess?.();
        this.load(event.id);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }
}
