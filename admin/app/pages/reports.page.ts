import { Component, inject, signal } from '@angular/core';
import { AdminApi } from '../api/admin-api.service';
import { readApiError } from '../../../src/app/api/models';
import type { GetAdminReports200 } from '../../../src/app/api/generated/model';

type ReportRow = GetAdminReports200['data'][number];

@Component({
  selector: 'admin-reports',
  template: `
    <h1>Reports Queue</h1>
    <p class="muted">Member reports of users, posts, comments, and events.</p>
    @if (loading()) {
      <p class="muted">Loading reports…</p>
    } @else if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    } @else if (rows().length === 0) {
      <p class="muted">No open reports.</p>
    } @else {
      @for (row of rows(); track row.id) {
        <article class="card">
          <p>
            <strong>{{ row.reporterHandle }}</strong> · {{ row.targetType }} · {{ row.status }}
          </p>
          <p>{{ row.reason }}</p>
          <button
            type="button"
            class="btn-primary"
            (click)="resolve(row)"
            [disabled]="busyId() === row.id"
          >
            Close report
          </button>
        </article>
      }
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
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly rows = signal<ReportRow[]>([]);
  readonly busyId = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.listReports({ status: 'open', size: 50 }).subscribe({
      next: (page) => {
        this.rows.set(page.data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.loading.set(false);
      },
    });
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
