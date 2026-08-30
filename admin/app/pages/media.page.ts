import { Component, inject, signal } from '@angular/core';
import { AdminApi } from '../api/admin-api.service';
import { readApiError } from '../../../src/app/api/models';
import type { GetAdminMedia200 } from '../../../src/app/api/generated/model';

type MediaRow = GetAdminMedia200['data'][number];

@Component({
  selector: 'admin-media',
  template: `
    <h1>Media Management</h1>
    <p class="muted">Inspect object keys and hide media so signed GET fails for members.</p>
    @if (loading()) {
      <p class="muted">Loading media…</p>
    } @else if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
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
          <p>{{ row.hidden ? 'Hidden' : 'Visible to ACL' }}</p>
          @if (!row.hidden) {
            <button type="button" (click)="hide(row)" [disabled]="busyId() === row.id">
              Revoke / hide
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
    }
  `,
})
export class MediaPage {
  private readonly api = inject(AdminApi);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly rows = signal<MediaRow[]>([]);
  readonly busyId = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.listMedia({ size: 50 }).subscribe({
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

  hide(row: MediaRow): void {
    this.busyId.set(row.id);
    this.api.hide('media', row.id, { reason: 'revoke signed access' }).subscribe({
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
