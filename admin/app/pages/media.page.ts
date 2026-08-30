import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../api/admin-api.service';
import { readApiError } from '../../../src/app/api/models';
import type { GetAdminMedia200 } from '../api/generated/model';

type MediaRow = GetAdminMedia200['data'][number];

function memberReadRule(kind: MediaRow['kind']): string {
  switch (kind) {
    case 'avatar':
      return 'Members who can view the owner profile';
    case 'post':
      return 'Members who can view the parent post';
    case 'event':
      return 'Members who can view the parent event';
    case 'message':
      return 'Members of the conversation';
    default:
      return 'Denied';
  }
}

@Component({
  selector: 'admin-media',
  imports: [FormsModule],
  template: `
    <h1>Media Management</h1>
    <p class="muted">
      Inspect product ACL (canRead) and revoke signed GET for members. Hide is not a delete; staff
      still see the row.
    </p>
    <label class="search"
      >Search
      <input
        type="search"
        [value]="query()"
        (input)="onQuery($event)"
        placeholder="Search by id, owner, or object key"
    /></label>
    <label class="search"
      >Revoke / hide reason
      <input [(ngModel)]="reason" name="reason" placeholder="Required to revoke signed access" />
    </label>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (loading()) {
      <p class="muted">Loading media…</p>
    } @else if (rows().length === 0) {
      <p class="muted">No media rows.</p>
    } @else {
      @for (row of rows(); track row.id) {
        <article class="card">
          <p>
            <strong>{{ row.kind }}</strong> · {{ row.mime }} · {{ row.bytes }} bytes
          </p>
          <p class="muted">{{ row.id }} · {{ row.ownerHandle }}</p>
          <p class="muted">{{ row.objectKey }}</p>
          <section class="acl">
            <h2>Access control</h2>
            <table>
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Role</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ row.ownerHandle }}</td>
                  <td>OWNER</td>
                  <td>User</td>
                </tr>
                <tr>
                  <td>admin, moderator</td>
                  <td>READ</td>
                  <td>Staff</td>
                </tr>
                <tr>
                  <td>{{ memberReadRule(row.kind) }}</td>
                  <td>{{ row.hidden ? 'REVOKED' : 'READ' }}</td>
                  <td>Member</td>
                </tr>
              </tbody>
            </table>
            <p>
              Signed GET for members:
              {{
                row.hidden
                  ? 'revoked (hide). Existing URLs fail after expiry.'
                  : row.status === 'ready'
                    ? 'issued after canRead (60 s TTL).'
                    : 'not issued until status is ready.'
              }}
            </p>
            @if (row.hidden && row.hiddenReason) {
              <p class="muted">Hidden reason: {{ row.hiddenReason }}</p>
            }
          </section>
          @if (row.hidden) {
            <button type="button" (click)="unhide(row)" [disabled]="busyId() === row.id">
              Restore signed access
            </button>
          } @else {
            <button type="button" (click)="revoke(row)" [disabled]="busyId() === row.id">
              Revoke signed access
            </button>
          }
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
      min-width: 0;
    }
    .search {
      display: grid;
      gap: 0.35rem;
      max-width: 28rem;
      margin-bottom: 0.75rem;
    }
    .acl h2 {
      margin: 0.25rem 0;
      font-size: 1rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      text-align: left;
      padding: 0.4rem 0.5rem;
      border-bottom: 1px solid #e5e7e9;
      font-size: 0.85rem;
    }
  `,
})
export class MediaPage {
  private readonly api = inject(AdminApi);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly rows = signal<MediaRow[]>([]);
  readonly busyId = signal<string | null>(null);
  readonly query = signal('');
  reason = '';
  readonly memberReadRule = memberReadRule;

  constructor() {
    this.reload();
  }

  onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    const q = this.query().trim();
    this.api.listMedia({ q: q || undefined, size: 50 }).subscribe({
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

  revoke(row: MediaRow): void {
    this.error.set(null);
    if (!this.reason.trim()) {
      this.error.set('A reason is required to revoke signed access.');
      return;
    }
    this.busyId.set(row.id);
    this.api.hide('media', row.id, { reason: this.reason.trim() }).subscribe({
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

  unhide(row: MediaRow): void {
    this.busyId.set(row.id);
    this.api.unhide('media', row.id).subscribe({
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
