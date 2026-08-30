import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { FriendsApi } from '../../api/friends-api.service';
import { readApiError } from '../../api/models';
import type { GetFriendships200DataItem } from '../../api/generated/model';

@Component({
  selector: 'app-friends',
  imports: [RouterLink],
  templateUrl: './friends.component.html',
  styleUrl: './friends.component.css',
})
export class FriendsPage {
  private readonly api = inject(FriendsApi);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly incoming = signal<GetFriendships200DataItem[]>([]);
  readonly outgoing = signal<GetFriendships200DataItem[]>([]);
  readonly accepted = signal<GetFriendships200DataItem[]>([]);
  readonly query = signal('');
  readonly busyId = signal<string | null>(null);

  readonly visibleFriends = computed(() => {
    const q = this.query().trim().toLowerCase();
    const rows = this.accepted();
    if (!q) {
      return rows;
    }
    return rows.filter((row) => {
      const name = row.peer.displayName.toLowerCase();
      const handle = row.peer.handle.toLowerCase();
      return name.includes(q) || handle.includes(q);
    });
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      incoming: this.api.list({ filter: 'incoming', size: 50 }),
      outgoing: this.api.list({ filter: 'outgoing', size: 50 }),
      accepted: this.api.list({ filter: 'accepted', size: 50 }),
    }).subscribe({
      next: (pages) => {
        this.incoming.set(pages.incoming.data);
        this.outgoing.set(pages.outgoing.data);
        this.accepted.set(pages.accepted.data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.loading.set(false);
      },
    });
  }

  accept(row: GetFriendships200DataItem): void {
    this.run(row.id, this.api.accept(row.id), () => this.reload());
  }

  decline(row: GetFriendships200DataItem): void {
    this.run(row.id, this.api.decline(row.id), () => this.reload());
  }

  cancel(row: GetFriendships200DataItem): void {
    this.run(row.id, this.api.remove(row.id), () => this.reload());
  }

  unfriend(row: GetFriendships200DataItem): void {
    this.run(row.id, this.api.remove(row.id), () => this.reload());
  }

  block(row: GetFriendships200DataItem): void {
    this.run(row.id, this.api.block({ userId: row.peer.userId }), () => this.reload());
  }

  onQuery(event: Event): void {
    const target = event.target;
    this.query.set(target instanceof HTMLInputElement ? target.value : '');
  }

  initials(row: GetFriendships200DataItem): string {
    const source = row.peer.displayName || row.peer.handle;
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private run(id: string, request: Observable<unknown>, onDone: () => void): void {
    this.busyId.set(id);
    this.error.set(null);
    request.subscribe({
      next: () => {
        this.busyId.set(null);
        onDone();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.error.set(readApiError(err));
      },
    });
  }
}
