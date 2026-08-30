import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../api/admin-api.service';
import { readApiError } from '../../../src/app/api/models';
import type { GetAdminContent200 } from '../api/generated/model';

type ContentType = 'post' | 'comment' | 'event' | 'media';
type ContentRow = GetAdminContent200['data'][number];

@Component({
  selector: 'admin-content',
  imports: [FormsModule],
  template: `
    <h1>Content Moderation</h1>
    <p class="muted">
      Review posts, comments, events, and media. Hide requires a reason; members then see NOT_FOUND.
      Staff still see the row and can unhide it.
    </p>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="notice">{{ notice() }}</p>
    }
    <div class="tabs" role="tablist">
      @for (tab of tabs; track tab.type) {
        <button
          type="button"
          role="tab"
          [class.active]="type() === tab.type"
          (click)="selectType(tab.type)"
        >
          {{ tab.label }}
        </button>
      }
    </div>
    <label class="search"
      >Search
      <input
        type="search"
        [value]="query()"
        (input)="onQuery($event)"
        placeholder="Search by author, text, or id"
    /></label>
    <label class="search"
      >Hide reason
      <input [(ngModel)]="reason" name="reason" placeholder="Required to hide" />
    </label>
    @if (loading()) {
      <p class="muted">Loading {{ type() }}s…</p>
    } @else if (rows().length === 0) {
      <p class="muted">No {{ type() }}s match this search.</p>
    } @else {
      <div class="grid">
        @for (row of rows(); track row.id) {
          <article class="card">
            <p>
              <strong>{{ row.authorHandle }}</strong> · {{ row.type }}
              @if (row.hidden) {
                <span class="badge">Hidden</span>
              }
            </p>
            <p>{{ row.summary || '—' }}</p>
            <p class="muted">{{ row.id }}</p>
            @if (row.hidden && row.hiddenReason) {
              <p class="muted">Reason: {{ row.hiddenReason }}</p>
            }
            @if (row.hidden) {
              <button type="button" (click)="unhide(row)" [disabled]="busy()">Unhide</button>
            } @else {
              <button type="button" class="btn-primary" (click)="hide(row)" [disabled]="busy()">
                Hide content
              </button>
            }
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
      min-width: 0;
    }
    .grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    }
    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 1rem 0;
    }
    .tabs button.active {
      background: #cdf2f1;
      color: #006d77;
      font-weight: 600;
    }
    .search {
      display: grid;
      gap: 0.35rem;
      max-width: 28rem;
      margin-bottom: 0.75rem;
    }
    .badge {
      background: #fedad6;
      color: #8d302f;
      border-radius: 0.25rem;
      padding: 0.1rem 0.4rem;
      font-size: 0.75rem;
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
export class ContentPage {
  private readonly api = inject(AdminApi);
  readonly tabs: { type: ContentType; label: string }[] = [
    { type: 'post', label: 'Posts' },
    { type: 'comment', label: 'Comments' },
    { type: 'event', label: 'Events' },
    { type: 'media', label: 'Media' },
  ];
  readonly type = signal<ContentType>('post');
  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busy = signal(false);
  readonly rows = signal<ContentRow[]>([]);
  reason = '';

  constructor() {
    this.reload();
  }

  selectType(type: ContentType): void {
    this.type.set(type);
    this.reload();
  }

  onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const q = this.query().trim();
    this.api.listContent({ type: this.type(), q: q || undefined, size: 50 }).subscribe({
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

  hide(row: ContentRow): void {
    this.error.set(null);
    if (!this.reason.trim()) {
      this.error.set('A hide reason is required.');
      return;
    }
    this.busy.set(true);
    this.api.hide(row.type, row.id, { reason: this.reason.trim() }).subscribe({
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

  unhide(row: ContentRow): void {
    this.error.set(null);
    this.busy.set(true);
    this.api.unhide(row.type, row.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.set('Content restored.');
        this.reload();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }
}
