import { Component, effect, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportButton } from '../reports/report-button.component';
import { MediaApi } from '../api/media-api.service';
import { PostsApi } from '../api/posts-api.service';
import { AuthSession } from '../auth/auth-session.service';
import { readApiError } from '../api/models';
import type { GetPostsId200 } from '../api/generated/model';

@Component({
  selector: 'app-post-card',
  imports: [RouterLink, ReportButton],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.css',
})
export class PostCard {
  private readonly media = inject(MediaApi);
  private readonly api = inject(PostsApi);
  private readonly session = inject(AuthSession);
  readonly changed = output<GetPostsId200>();
  readonly removed = output<string>();
  readonly editing = signal(false);
  readonly confirmingDelete = signal(false);
  readonly draft = signal('');
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  ownPost(): boolean {
    return this.post().author.userId === this.session.userId();
  }
  canEdit(): boolean {
    return this.ownPost() && Date.now() - Date.parse(this.post().createdAt) < 15 * 60_000;
  }
  beginEdit(): void {
    this.draft.set(this.post().body ?? '');
    this.editing.set(true);
  }
  saveEdit(): void {
    const body = this.draft().trim();
    if ((!body && !this.post().mediaIds.length) || body.length > 2000) {
      this.error.set('Write a post of up to 2,000 characters or keep an image.');
      return;
    }
    this.busy.set(true);
    this.api.edit(this.post().id, body).subscribe({
      next: (post) => {
        this.changed.emit(post);
        this.editing.set(false);
        this.busy.set(false);
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.busy.set(false);
      },
    });
  }
  deletePost(): void {
    this.busy.set(true);
    this.api.remove(this.post().id).subscribe({
      next: () => {
        this.removed.emit(this.post().id);
        this.busy.set(false);
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.busy.set(false);
      },
    });
  }

  readonly post = input.required<GetPostsId200>();
  readonly activityAt = input<string | null>(null);
  readonly imageUrls = input<Record<string, string>>({});
  readonly like = output<GetPostsId200>();
  readonly repost = output<GetPostsId200>();
  readonly avatarUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.post().author.avatarMediaId;
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

  initials(): string {
    const author = this.post().author;
    const source = author.displayName || author.handle;
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  likeLabel(): string {
    const n = this.post().likeCount;
    return `${n} ${n === 1 ? 'Like' : 'Likes'}`;
  }

  commentLabel(): string {
    const n = this.post().commentCount;
    return `${n} ${n === 1 ? 'Comment' : 'Comments'}`;
  }

  when(): string {
    const created = Date.parse(this.activityAt() ?? this.post().createdAt);
    if (Number.isNaN(created)) {
      return '';
    }
    const delta = Math.max(0, Date.now() - created);
    const minutes = Math.floor(delta / 60000);
    if (minutes < 1) {
      return 'just now';
    }
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
