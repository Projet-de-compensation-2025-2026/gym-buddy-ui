import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommentsApi } from '../api/comments-api.service';
import { MediaApi } from '../api/media-api.service';
import { readApiError } from '../api/models';
import type { GetPostsIdComments200DataItem } from '../api/generated/model';
import { AuthSession } from '../auth/auth-session.service';

export type ThreadComment = GetPostsIdComments200DataItem;

@Component({
  selector: 'app-comment-thread',
  imports: [FormsModule, RouterLink, CommentThread],
  templateUrl: './comment-thread.component.html',
  styleUrl: './comment-thread.component.css',
})
export class CommentThread {
  private readonly commentsApi = inject(CommentsApi);
  private readonly media = inject(MediaApi);
  readonly session = inject(AuthSession);

  readonly comment = input.required<ThreadComment>();
  readonly created = output<ThreadComment>();

  readonly row = signal<ThreadComment | null>(null);
  readonly replies = signal<ThreadComment[]>([]);
  readonly repliesNext = signal<string | null>(null);
  readonly repliesOpen = signal(false);
  readonly replyOpen = signal(false);
  readonly replyBody = signal('');
  readonly avatarUrl = signal<string | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => this.row.set(this.comment()));
    effect(() => {
      const id = this.comment().author.avatarMediaId;
      if (!id) {
        this.avatarUrl.set(null);
        return;
      }
      this.media.url(id).subscribe({
        next: (signed) => this.avatarUrl.set(signed.url),
        error: () => this.avatarUrl.set(null),
      });
    });
  }

  current(): ThreadComment {
    return this.row() ?? this.comment();
  }

  initials(): string {
    const author = this.current().author;
    const source = author.displayName || author.handle;
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  when(): string {
    const created = Date.parse(this.current().createdAt);
    if (Number.isNaN(created)) {
      return '';
    }
    const delta = Math.max(0, Date.now() - created);
    const minutes = Math.floor(delta / 60000);
    if (minutes < 1) {
      return 'just now';
    }
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h`;
    }
    return `${Math.floor(hours / 24)}d`;
  }

  remainingReplies(): number {
    return Math.max(0, this.current().replyCount - this.replies().length);
  }

  canReply(): boolean {
    return !this.current().deleted && this.current().depth < 4;
  }

  isAuthor(): boolean {
    return this.session.handle() === this.current().author.handle;
  }

  loadReplies(): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const before = this.repliesOpen() ? (this.repliesNext() ?? undefined) : undefined;
    this.commentsApi.replies(this.current().id, { before, size: 20 }).subscribe({
      next: (page) => {
        const batch = page.data as ThreadComment[];
        this.replies.set(this.repliesOpen() ? [...this.replies(), ...batch] : batch);
        this.repliesNext.set(page.page.next ?? null);
        this.repliesOpen.set(true);
        this.busy.set(false);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }

  submitReply(): void {
    const body = this.replyBody().trim();
    if (!body || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.commentsApi
      .create(this.current().postId, { body, parentId: this.current().id })
      .subscribe({
        next: (created) => {
          this.replies.set([...this.replies(), created as ThreadComment]);
          this.repliesOpen.set(true);
          this.row.set({ ...this.current(), replyCount: this.current().replyCount + 1 });
          this.replyBody.set('');
          this.replyOpen.set(false);
          this.busy.set(false);
          this.created.emit(created);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.error.set(readApiError(err));
        },
      });
  }

  toggleLike(): void {
    const current = this.current();
    this.busy.set(true);
    const call = current.liked
      ? this.commentsApi.unlike(current.id)
      : this.commentsApi.like(current.id);
    call.subscribe({
      next: () => {
        this.row.set({
          ...current,
          liked: !current.liked,
          likeCount: current.likeCount + (current.liked ? -1 : 1),
        });
        this.busy.set(false);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }

  deleteOwn(): void {
    const current = this.current();
    this.busy.set(true);
    this.commentsApi.delete(current.id).subscribe({
      next: () => {
        this.row.set({ ...current, deleted: true, body: 'comment deleted' });
        this.busy.set(false);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }
}
