import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PagedList } from '../api/paged-list';
import { AdminApi } from '../api/admin-api.service';
import { readApiError } from '../../../src/app/api/models';
import { AuthSession } from '../../../src/app/auth/auth-session.service';
import type { GetAdminAudit200 } from '../api/generated/model';
import { GetAdminAuditAction } from '../api/generated/model';

type AuditRow = GetAdminAudit200['data'][number];

@Component({
  selector: 'admin-audit',
  imports: [DatePipe, FormsModule],
  template: `
    <h1>Audit Log</h1>
    <p class="muted">Append-only record of staff actions. Admin only.</p>
    @if (session.isAdmin()) {
      <div class="filters">
        <label class="search"
          >Search log
          <input
            type="search"
            [(ngModel)]="query"
            (ngModelChange)="reload()"
            placeholder="Search staff, action, or reason"
        /></label>
        <label
          >Action
          <select [(ngModel)]="action" (ngModelChange)="reload()">
            <option value="">All actions</option>
            @for (item of actions; track item) {
              <option [value]="item">{{ actionLabel(item) }}</option>
            }
          </select></label
        >
      </div>
    }
    @if (!session.isAdmin()) {
      <p class="muted">Only admins can view the audit log.</p>
    } @else if (loading() && rows().length === 0) {
      <p class="muted">Loading audit events…</p>
    } @else if (error() && rows().length === 0) {
      <p class="error" role="alert">{{ error() }}</p>
      <button type="button" (click)="reload()" [disabled]="loading()">Retry</button>
    } @else if (rows().length === 0) {
      <p class="muted">No audit events.</p>
    } @else {
      <div class="table-scroll" tabindex="0" role="region" aria-label="Audit table">
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
                <td>{{ row.at | date: 'medium' }}</td>
                <td>{{ row.actorHandle }}</td>
                <td>
                  <span class="badge">{{ actionLabel(row.action) }}</span>
                </td>
                <td>{{ row.targetType }} {{ row.targetId }}</td>
                <td>{{ row.reason || '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
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
  readonly session = inject(AuthSession);
  private readonly list = new PagedList<AuditRow>((after) =>
    this.api.listAudit({
      q: this.query.trim() || undefined,
      action: this.action || undefined,
      after,
      size: 50,
    }),
  );
  readonly loading = this.list.loading;
  readonly nextCursor = this.list.next;
  readonly error = this.list.error;
  readonly rows = this.list.rows;
  query = '';
  action: GetAdminAuditAction | '' = '';
  readonly actions = Object.values(GetAdminAuditAction);

  actionLabel(action: string): string {
    return action.replaceAll('_', ' ');
  }

  constructor() {
    if (!this.session.isAdmin()) {
      this.loading.set(false);
      return;
    }
    this.reload();
  }

  reload(append = false): void {
    if (this.session.isAdmin()) this.list.load(append);
  }
}
