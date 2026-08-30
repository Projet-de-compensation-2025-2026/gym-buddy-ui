import { Component, inject, signal } from '@angular/core';
import { AdminApi } from '../api/admin-api.service';
import { readApiError } from '../../../src/app/api/models';
import type { GetAdminAudit200 } from '../../../src/app/api/generated/model';

type AuditRow = GetAdminAudit200['data'][number];

@Component({
  selector: 'admin-audit',
  template: `
    <h1>Audit Log</h1>
    <p class="muted">Append-only record of staff actions.</p>
    @if (loading()) {
      <p class="muted">Loading audit events…</p>
    } @else if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    } @else if (rows().length === 0) {
      <p class="muted">No audit events.</p>
    } @else {
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Staff</th>
            <th>Action</th>
            <th>Target</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.id) {
            <tr>
              <td>{{ row.at }}</td>
              <td>{{ row.actorHandle }}</td>
              <td>{{ row.action }}</td>
              <td>{{ row.targetType }} {{ row.targetId }}</td>
              <td>{{ row.reason || '—' }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: `
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border: 1px solid #e5e7e9;
    }
    th,
    td {
      text-align: left;
      padding: 0.75rem;
      border-bottom: 1px solid #e5e7e9;
      font-size: 0.9rem;
    }
  `,
})
export class AuditPage {
  private readonly api = inject(AdminApi);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly rows = signal<AuditRow[]>([]);

  constructor() {
    this.api.listAudit({ size: 50 }).subscribe({
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
}
