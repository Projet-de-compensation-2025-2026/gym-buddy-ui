import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../api/admin-api.service';
import { readApiError } from '../../../src/app/api/models';
import type { GetAdminReports200 } from '../../../src/app/api/generated/model';

type ReportRow = GetAdminReports200['data'][number];

@Component({
  selector: 'admin-content',
  imports: [FormsModule],
  template: `
    <h1>Content Moderation</h1>
    <p class="muted">
      Hide posts, comments, events, or media with a reason. Members then see NOT_FOUND.
    </p>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="notice">{{ notice() }}</p>
    }
    <form class="card" (ngSubmit)="hideTyped()">
      <label
        >Type
        <select [(ngModel)]="type" name="type">
          <option value="post">Post</option>
          <option value="comment">Comment</option>
          <option value="event">Event</option>
          <option value="media">Media</option>
        </select>
      </label>
      <label>Id <input [(ngModel)]="targetId" name="id" required /></label>
      <label>Reason <input [(ngModel)]="reason" name="reason" required /></label>
      <button class="btn-primary" type="submit" [disabled]="busy()">Hide content</button>
    </form>
    <h2>Open reports</h2>
    @if (loading()) {
      <p class="muted">Loading reports…</p>
    } @else if (reports().length === 0) {
      <p class="muted">No open reports.</p>
    } @else {
      <div class="grid">
        @for (row of reports(); track row.id) {
          <article class="card">
            <p>
              <strong>{{ row.reporterHandle }}</strong> · {{ row.targetType }} {{ row.targetId }}
            </p>
            <p>{{ row.reason }}</p>
            @if (row.targetType !== 'user') {
              <button
                type="button"
                class="btn-primary"
                (click)="hideReport(row)"
                [disabled]="busy()"
              >
                Hide content
              </button>
            }
            <button type="button" (click)="resolve(row)" [disabled]="busy()">Close report</button>
          </article>
        }
      </div>
    }
  `,
  styles: `
    .card {
      background: #fff;
      border: 1px solid #e5e7e9;
      border-radius: 0.5rem;
      padding: 1rem;
      display: grid;
      gap: 0.65rem;
      margin: 1rem 0;
    }
    .grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    }
    label {
      display: grid;
      gap: 0.25rem;
    }
    .btn-primary {
      background: #006d77;
      color: #fff;
      border: 0;
      border-radius: 0.25rem;
      padding: 0.5rem 1rem;
      font-weight: 600;
    }
  `,
})
export class ContentPage {
  private readonly api = inject(AdminApi);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busy = signal(false);
  readonly reports = signal<ReportRow[]>([]);
  type = 'post';
  targetId = '';
  reason = '';

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.listReports({ status: 'open', size: 50 }).subscribe({
      next: (page) => {
        this.reports.set(page.data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.loading.set(false);
      },
    });
  }

  hideTyped(): void {
    this.runHide(this.type, this.targetId, this.reason);
  }

  hideReport(row: ReportRow): void {
    this.runHide(row.targetType, row.targetId, row.reason);
  }

  resolve(row: ReportRow): void {
    this.busy.set(true);
    this.api.resolve(row.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.set('Report closed.');
        this.reload();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }

  private runHide(type: string, id: string, reason: string): void {
    this.error.set(null);
    if (!id.trim() || !reason.trim()) {
      this.error.set('Type, id, and reason are required.');
      return;
    }
    this.busy.set(true);
    this.api.hide(type, id.trim(), { reason: reason.trim() }).subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.set('Content hidden.');
        this.reload();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }
}
