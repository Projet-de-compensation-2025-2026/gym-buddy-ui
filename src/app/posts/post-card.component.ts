import { Component, effect, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MediaApi } from '../api/media-api.service';
import type { GetPostsId200 } from '../api/generated/model';

@Component({
  selector: 'app-post-card',
  imports: [RouterLink],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.css',
})
export class PostCard {
  private readonly media = inject(MediaApi);

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
