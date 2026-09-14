import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FriendsApi } from '../../api/friends-api.service';
import { MessagingApi } from '../../api/messaging-api.service';
import { readApiError } from '../../api/models';
import type {
  GetConversations200DataItem,
  GetFriendships200DataItem,
} from '../../api/generated/model';

@Component({
  selector: 'app-inbox',
  imports: [RouterLink],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.css',
})
export class InboxPage {
  private readonly api = inject(MessagingApi);
  private readonly friends = inject(FriendsApi);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly threads = signal<GetConversations200DataItem[]>([]);
  readonly composing = signal(false);
  readonly friendsList = signal<GetFriendships200DataItem[]>([]);
  readonly busy = signal(false);
  readonly next = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  reload(append = false): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .inbox({ size: 50, before: append ? (this.next() ?? undefined) : undefined })
      .subscribe({
        next: (page) => {
          this.threads.set(append ? [...this.threads(), ...page.data] : page.data);
          this.next.set(page.page.next ?? null);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(readApiError(err));
          this.loading.set(false);
        },
      });
  }

  preview(row: GetConversations200DataItem): string {
    const last = row.lastMessage;
    if (!last || last.deleted) {
      return last?.deleted ? 'Message deleted' : 'No messages yet';
    }
    if (last.type === 'image') {
      return last.body || 'Sent a photo';
    }
    if (last.type === 'audio') {
      return 'Sent an audio clip';
    }
    return last.body ?? '';
  }

  when(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    return sameDay
      ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : date.toLocaleDateString([], { weekday: 'short' });
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  openComposer(): void {
    this.composing.set(true);
    this.friends.listAll({ filter: 'accepted' }).subscribe({
      next: (page) => this.friendsList.set(page.data),
      error: (err: unknown) => this.error.set(readApiError(err)),
    });
  }

  startChat(row: GetFriendships200DataItem): void {
    this.busy.set(true);
    this.api.open({ userId: row.peer.userId }).subscribe({
      next: (conversation) => {
        this.busy.set(false);
        void this.router.navigate(['/messages', conversation.id]);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }
}
