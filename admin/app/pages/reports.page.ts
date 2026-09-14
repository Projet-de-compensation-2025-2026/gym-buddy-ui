import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PagedList } from '../api/paged-list';
import { AdminApi } from '../api/admin-api.service';
import { readApiError } from '../../../src/app/api/models';
import type { GetAdminReports200 } from '../api/generated/model';

type ReportRow = GetAdminReports200['data'][number];

@Component({
  selector: 'admin-reports',
  imports: [DatePipe, FormsModule],
  template: `
    <h1>Reports Queue</h1>
    <p class="muted">Member reports of users, posts, comments, and events.</p>
    <div class="filters">
      <label class="search"
        >Search reports
        <input
          type="search"
          [(ngModel)]="query"
          (ngModelChange)="reload()"
          placeholder="Search reporter or reason"
      /></label>
      <label
        >Status
        <select [(ngModel)]="status" (ngModelChange)="reload()">
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select></label
      >
    </div>
    @if (loading() && rows().length === 0) {
      <p class="muted">Loading reports…</p>
    } @else if (error() && rows().length === 0) {
      <p class="error" role="alert">{{ error() }}</p>
      <button type="button" (click)="reload()" [disabled]="loading()">Retry</button>
    } @else if (rows().length === 0) {
      <p class="muted">No reports match these filters.</p>
    } @else {
      @for (row of rows(); track row.id) {
        <article class="card">
          <p>
            <strong>{{ row.reporterHandle }}</strong> ·
            <span class="badge">{{ row.status }}</span> · {{ row.createdAt | date: 'medium' }}
          </p>
          <p>
            <span class="muted">Reported {{ row.targetType }}</span> <code>{{ row.targetId }}</code>
          </p>
          <p class="report-reason">{{ row.reason }}</p>
          @if (row.status === 'open') {
            <button
              type="button"
              class="btn-primary"
              (click)="resolve(row)"
              [disabled]="busyId() === row.id"
            >
              Close report
            </button>
          }
        </article>
      }
    }
    @if (rows().length > 0) {
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      <footer class="list-footer">
        <span class="muted">Entries: {{ rows().length }}</span>
        @if (nextCursor()) {
          <button type="button" (click)="reload(true)" [disabled]="loading()">
            {{ loading() ? 'Loading…' : 'Load more' }}
          </button>
        }
      </footer>
    }
  `,
  styles: `
    .card {
      background: #fff;
      border: 1px solid #e5e7e9;
      border-radius: 0.5rem;
      padding: 1rem;
      margin: 0.75rem 0;
      display: grid;
      gap: 0.5rem;
    }
    .btn-primary {
      background: #006d77;
      color: #fff;
      border: 0;
      border-radius: 0.25rem;
      padding: 0.5rem 1rem;
      font-weight: 600;
      width: max-content;
    }
  `,
})
export class ReportsPage {
  private readonly api = inject(AdminApi);
  private readonly list = new PagedList<ReportRow>((after) =>
    this.api.listReports({
      status: this.status || undefined,
      q: this.query.trim() || undefined,
      after,
      size: 50,
    }),
  );
  readonly loading = this.list.loading;
  readonly nextCursor = this.list.next;
  readonly error = this.list.error;
  readonly rows = this.list.rows;
  readonly busyId = signal<string | null>(null);
  query = '';
  status: 'open' | 'resolved' = 'open';

  constructor() {
    this.reload();
  }

  reload(append = false): void {
    this.list.load(append);
  }

  resolve(row: ReportRow): void {
    this.busyId.set(row.id);
    this.api.resolve(row.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.reload();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.error.set(readApiError(err));
      },
    });
  }
}
