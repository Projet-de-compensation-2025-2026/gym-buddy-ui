import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PagedList } from '../api/paged-list';
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
      Review uploaded files and who can access them. Hide files to stop new member access, or
      restore them after review.
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
      <button type="button" (click)="reload()" [disabled]="loading()">Retry</button>
    }
    @if (loading() && rows().length === 0) {
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
              Member access:
              {{
                row.hidden
                  ? 'hidden. Previously opened links expire shortly.'
                  : row.status === 'ready'
                    ? 'available to authorized viewers through temporary links.'
                    : 'unavailable until processing finishes.'
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
    @if (rows().length > 0) {
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
  private readonly list = new PagedList<MediaRow>((after) =>
    this.api.listMedia({ q: this.query().trim() || undefined, after, size: 50 }),
  );
  readonly loading = this.list.loading;
  readonly nextCursor = this.list.next;
  readonly error = this.list.error;
  readonly rows = this.list.rows;
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

  reload(append = false): void {
    this.list.load(append);
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
