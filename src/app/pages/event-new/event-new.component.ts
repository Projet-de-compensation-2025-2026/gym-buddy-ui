import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EventsApi } from '../../api/events-api.service';
import { readApiError } from '../../api/models';
import type { PostEventsBodyVisibility } from '../../api/generated/model';

const ACTIVITIES = [
  'Weightlifting',
  'Powerlifting',
  'Track & Field',
  'Running',
  'HIIT',
  'Yoga',
  'CrossFit',
  'Cycling',
  'Swimming',
];

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

@Component({
  selector: 'app-event-new',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './event-new.component.html',
  styleUrl: './event-new.component.css',
})
export class EventNewPage {
  private readonly api = inject(EventsApi);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  readonly activities = ACTIVITIES;
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly recurring = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    activity: ['', Validators.required],
    place: ['', [Validators.required, Validators.maxLength(200)]],
    startsAt: ['', Validators.required],
    durationMin: [60, [Validators.required, Validators.min(1), Validators.max(1440)]],
    visibility: ['public' as PostEventsBodyVisibility, Validators.required],
    capacity: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
  });

  toggleRecurring(): void {
    this.recurring.update((value) => !value);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const startsAt = new Date(value.startsAt).toISOString();
    this.submitting.set(true);
    this.error.set(null);
    this.api
      .create({
        title: value.title.trim(),
        activity: value.activity,
        place: value.place.trim(),
        startsAt,
        durationMin: value.durationMin,
        visibility: value.visibility,
        capacity: value.capacity,
        recurrence: this.recurring() ? weeklyRule(startsAt) : null,
      })
      .subscribe({
        next: (created) => {
          this.submitting.set(false);
          void this.router.navigate(['/events', created.id]);
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.error.set(readApiError(err));
        },
      });
  }
}

function weeklyRule(startsAt: string): string {
  const day = BYDAY[new Date(startsAt).getUTCDay()] ?? 'MO';
  return `FREQ=WEEKLY;BYDAY=${day}`;
}
