import { Component, inject, signal } from '@angular/core';
import { AdminApi, type FixtureCounts } from '../api/admin-api.service';
import { readApiError } from '../../../src/app/api/models';
import { AuthSession } from '../../../src/app/auth/auth-session.service';

@Component({
  selector: 'admin-fixtures',
  template: `
    <h1>Database Fixtures</h1>
    <p class="muted">
      Approved spec targets: users 3 000, friendships 12 000, posts 15 000, comments 20 000, events
      800, applications 4 000, messages 10 000, media metadata 5 000.
    </p>
    <p class="warn">
      Non-production only. Generating fixtures will append synthetic rows. Reset truncates domain
      tables and cannot be undone. Disabled on prod (FORBIDDEN).
    </p>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="notice">{{ notice() }}</p>
    }
    @if (!session.isAdmin()) {
      <p class="muted">Only admins can trigger fixtures.</p>
    } @else {
      <div class="grid">
        @for (card of cards; track card.key) {
          <article class="card">
            <header>
              <h2>{{ card.title }}</h2>
              <p class="muted">{{ card.hint }}</p>
            </header>
            <label>
              Count
              <input
                type="number"
                min="0"
                [value]="counts()[card.key]"
                (input)="onCount(card.key, $event)"
              />
            </label>
          </article>
        }
      </div>
      <div class="actions">
        <button class="btn-primary" type="button" (click)="generate()" [disabled]="busy()">
          @if (busy()) {
            Generating…
          } @else {
            Generate fixtures
          }
        </button>
        <button class="btn-danger" type="button" (click)="reset()" [disabled]="busy()">
          Reset fixtures
        </button>
      </div>
    }
  `,
  styles: `
    .warn {
      background: #fedad6;
      color: #8d302f;
      padding: 1rem;
      border-radius: 0.5rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      gap: 1rem;
      margin: 1.5rem 0;
    }
    .card {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1rem 1.1rem;
      box-shadow: 0 1px 2px rgb(15 23 42 / 8%);
    }
    .card h2 {
      margin: 0;
      font-size: 1.05rem;
    }
    label {
      display: grid;
      gap: 0.35rem;
      margin-top: 0.75rem;
      font-size: 0.85rem;
    }
    input {
      border: 1px solid #d7dbdf;
      border-radius: 0.4rem;
      padding: 0.5rem 0.65rem;
    }
    .actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .btn-primary {
      background: #006d77;
      color: #fff;
      border: 0;
      border-radius: 0.25rem;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
    }
    .btn-danger {
      background: transparent;
      color: #8d302f;
      border: 0;
      font-weight: 600;
    }
    button:disabled {
      opacity: 0.6;
    }
  `,
})
export class FixturesPage {
  private readonly api = inject(AdminApi);
  readonly session = inject(AuthSession);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly counts = signal<FixtureCounts>({
    users: 3000,
    friendships: 12000,
    posts: 15000,
    comments: 20000,
    events: 800,
    applications: 4000,
    messages: 10000,
    media: 5000,
  });
  readonly cards: { key: keyof Required<FixtureCounts>; title: string; hint: string }[] = [
    { key: 'users', title: 'Users', hint: 'Profiles, settings, auth. Named demos always exist.' },
    {
      key: 'friendships',
      title: 'Friendships',
      hint: 'Accepted pairs. Power-law hubs + city×sport clusters.',
    },
    { key: 'posts', title: 'Posts', hint: 'Feed updates. Optional stock photo metadata.' },
    { key: 'comments', title: 'Comments', hint: 'Nested threads on existing posts.' },
    { key: 'events', title: 'Events', hint: 'Instant sessions with occurrences.' },
    {
      key: 'applications',
      title: 'Applications',
      hint: 'Event applications (pending / accepted).',
    },
    { key: 'messages', title: 'Messages', hint: 'Direct messages between friends.' },
    {
      key: 'media',
      title: 'Media metadata',
      hint: 'Reuses ~10 stock MinIO objects. No unique JPEGs.',
    },
  ];

  onCount(key: keyof Required<FixtureCounts>, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.counts.update((current) => ({ ...current, [key]: Number.isFinite(value) ? value : 0 }));
  }

  generate(): void {
    this.run(() => this.api.generateFixtures(this.counts()), 'Fixtures generated.');
  }

  reset(): void {
    this.run(() => this.api.resetFixtures(), 'Fixtures reset.');
  }

  private run(call: () => ReturnType<AdminApi['generateFixtures']>, ok: string): void {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    call().subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.set(ok);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }
}
