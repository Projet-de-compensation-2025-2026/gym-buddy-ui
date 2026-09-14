import { Component, inject, model, signal } from '@angular/core';
import { FriendsApi } from '../api/friends-api.service';
import { readApiError } from '../api/models';
import type { GetFriendships200DataItem } from '../api/generated/model';

@Component({
  selector: 'app-event-invitees',
  template: `
    <fieldset>
      <legend>Invite friends</legend>
      <p class="muted">
        Only invited members can see this private event. They still apply to join.
      </p>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @for (friend of friends(); track friend.peer.userId) {
        <label class="invitee"
          ><input
            type="checkbox"
            [checked]="selected().includes(friend.peer.userId)"
            (change)="toggle(friend.peer.userId)"
          />{{ friend.peer.displayName || friend.peer.handle }}</label
        >
      } @empty {
        <p class="muted">
          {{ loading() ? 'Loading friends…' : 'Add friends to invite them to your event.' }}
        </p>
      }
      @if (next()) {
        <button type="button" class="btn-secondary" [disabled]="loading()" (click)="load()">
          More friends
        </button>
      }
      <p class="muted">{{ selected().length }} invited</p>
    </fieldset>
  `,
  styles: `
    fieldset {
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
      min-width: 0;
    }
    legend {
      font-weight: 600;
    }
    .invitee {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.5rem 0;
    }
  `,
})
export class EventInvitees {
  private readonly api = inject(FriendsApi);
  readonly selected = model<string[]>([]);
  readonly friends = signal<GetFriendships200DataItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly next = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.list({ filter: 'accepted', size: 50, after: this.next() ?? undefined }).subscribe({
      next: (page) => {
        this.friends.update((rows) => [...rows, ...page.data]);
        this.next.set(page.page.next ?? null);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.loading.set(false);
      },
    });
  }

  toggle(id: string): void {
    this.selected.update((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  }
}
