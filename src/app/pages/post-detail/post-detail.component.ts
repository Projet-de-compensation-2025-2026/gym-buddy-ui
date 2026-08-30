import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MediaApi } from '../../api/media-api.service';
import { PostsApi } from '../../api/posts-api.service';
import { readApiError } from '../../api/models';
import type { GetPostsId200 } from '../../api/generated/model';
import { PostCard } from '../../posts/post-card.component';

@Component({
  selector: 'app-post-detail',
  imports: [RouterLink, PostCard],
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.css',
})
export class PostDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly postsApi = inject(PostsApi);
  private readonly media = inject(MediaApi);

  readonly post = signal<GetPostsId200 | null>(null);
  readonly imageUrls = signal<Record<string, string>>({});
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('post not found');
      this.loading.set(false);
      return;
    }
    this.postsApi.get(id).subscribe({
      next: (post) => {
        this.post.set(post);
        this.loading.set(false);
        this.loadImages(post);
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.loading.set(false);
      },
    });
  }

  toggleLike(post: GetPostsId200): void {
    this.busy.set(true);
    const call = post.liked ? this.postsApi.unlike(post.id) : this.postsApi.like(post.id);
    call.subscribe({
      next: () => {
        this.post.set({
          ...post,
          liked: !post.liked,
          likeCount: post.likeCount + (post.liked ? -1 : 1),
        });
        this.busy.set(false);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }

  toggleRepost(post: GetPostsId200): void {
    this.busy.set(true);
    if (post.reposted) {
      this.postsApi.unrepost(post.id).subscribe({
        next: () => {
          this.post.set({
            ...post,
            reposted: false,
            repostCount: Math.max(0, post.repostCount - 1),
          });
          this.busy.set(false);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.error.set(readApiError(err));
        },
      });
      return;
    }
    this.postsApi.repost(post.id).subscribe({
      next: (updated) => {
        this.post.set(updated);
        this.busy.set(false);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }

  private loadImages(post: GetPostsId200): void {
    for (const mediaId of post.mediaIds) {
      this.media.url(mediaId).subscribe({
        next: (signed) => this.imageUrls.set({ ...this.imageUrls(), [mediaId]: signed.url }),
        error: () => undefined,
      });
    }
  }
}
