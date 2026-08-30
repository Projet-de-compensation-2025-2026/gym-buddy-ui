import { Component, inject, signal } from '@angular/core';
import { AdminApi } from '../api/admin-api.service';
import { readApiError } from '../../../src/app/api/models';
import { AuthSession } from '../../../src/app/auth/auth-session.service';
import type { GetAdminUsers200 } from '../../../src/app/api/generated/model';

type AdminUserRow = GetAdminUsers200['data'][number];

@Component({
  selector: 'admin-users',
  template: `
    <header class="head">
      <div>
        <h1>User Management</h1>
        <p class="muted">Manage accounts, roles, and access across the platform.</p>
      </div>
    </header>
    <label class="search"
      >Search
      <input
        type="search"
        [value]="query()"
        (input)="onQuery($event)"
        placeholder="Search users by name, email, or handle"
    /></label>
    @if (loading()) {
      <p class="muted">Loading users…</p>
    } @else if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    } @else if (rows().length === 0) {
      <p class="muted">No users match this search.</p>
    } @else {
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.id) {
            <tr>
              <td>
                <strong>{{ row.displayName }}</strong>
                <div class="muted">{{ row.handle }} · {{ row.email }}</div>
              </td>
              <td>{{ row.status }}</td>
              <td>{{ joined(row.createdAt) }}</td>
              <td>
                @if (session.isAdmin()) {
                  <select
                    [value]="row.role"
                    [disabled]="busyId() === row.id || row.lastAdmin"
                    (change)="onRole(row, $event)"
                  >
                    <option value="member">Member</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                  @if (row.lastAdmin) {
                    <div class="danger">Last admin</div>
                  }
                } @else {
                  {{ row.role }}
                }
              </td>
              <td>
                @if (row.status === 'locked' || row.status === 'closed') {
                  <button type="button" (click)="unlock(row)" [disabled]="busyId() === row.id">
                    Unlock
                  </button>
                } @else {
                  <button
                    type="button"
                    (click)="lock(row)"
                    [disabled]="busyId() === row.id || row.lastAdmin"
                  >
                    Lock
                  </button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: `
    .head {
      margin-bottom: 1rem;
    }
    .search {
      display: grid;
      gap: 0.35rem;
      max-width: 28rem;
      margin-bottom: 1rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border: 1px solid #e5e7e9;
      border-radius: 0.5rem;
    }
    th,
    td {
      text-align: left;
      padding: 0.85rem;
      border-bottom: 1px solid #e5e7e9;
    }
    .danger {
      color: #8d302f;
      font-size: 0.75rem;
    }
  `,
})
export class UsersPage {
  private readonly api = inject(AdminApi);
  readonly session = inject(AuthSession);
  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly rows = signal<AdminUserRow[]>([]);
  readonly busyId = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.reload();
  }

  onRole(row: AdminUserRow, event: Event): void {
    this.changeRole(row, (event.target as HTMLSelectElement).value);
  }

  joined(value: string): string {
    return value.slice(0, 10);
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const q = this.query().trim();
    this.api.listUsers({ q: q || undefined, size: 50 }).subscribe({
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

  changeRole(row: AdminUserRow, role: string): void {
    if (role === row.role) {
      return;
    }
    this.busyId.set(row.id);
    this.api.changeRole(row.id, { role: role as 'member' | 'moderator' | 'admin' }).subscribe({
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

  lock(row: AdminUserRow): void {
    this.busyId.set(row.id);
    this.api.lock(row.id, { reason: 'policy abuse' }).subscribe({
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

  unlock(row: AdminUserRow): void {
    this.busyId.set(row.id);
    this.api.unlock(row.id).subscribe({
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
