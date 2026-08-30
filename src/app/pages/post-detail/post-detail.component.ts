import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommentsApi } from '../../api/comments-api.service';
import { MediaApi } from '../../api/media-api.service';
import { PostsApi } from '../../api/posts-api.service';
import { readApiError } from '../../api/models';
import type { GetPostsId200, GetPostsIdComments200DataItem } from '../../api/generated/model';
import { CommentThread } from '../../posts/comment-thread.component';
import { PostCard } from '../../posts/post-card.component';

@Component({
  selector: 'app-post-detail',
  imports: [FormsModule, RouterLink, PostCard, CommentThread],
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.css',
})
export class PostDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly postsApi = inject(PostsApi);
  private readonly commentsApi = inject(CommentsApi);
  private readonly media = inject(MediaApi);

  readonly post = signal<GetPostsId200 | null>(null);
  readonly imageUrls = signal<Record<string, string>>({});
  readonly comments = signal<GetPostsIdComments200DataItem[]>([]);
  readonly commentsNext = signal<string | null>(null);
  readonly commentBody = signal('');
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
        this.loadComments(post.id);
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

  loadComments(postId: string, before?: string): void {
    this.commentsApi.list(postId, { before, size: 20 }).subscribe({
      next: (page) => {
        this.comments.set(before ? [...this.comments(), ...page.data] : page.data);
        this.commentsNext.set(page.page.next ?? null);
      },
      error: (err: unknown) => this.error.set(readApiError(err)),
    });
  }

  loadMoreComments(): void {
    const post = this.post();
    const next = this.commentsNext();
    if (!post || !next) {
      return;
    }
    this.loadComments(post.id, next);
  }

  submitComment(): void {
    const post = this.post();
    const body = this.commentBody().trim();
    if (!post || !body || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.commentsApi.create(post.id, { body }).subscribe({
      next: (created) => {
        this.comments.set([created, ...this.comments()]);
        this.post.set({ ...post, commentCount: post.commentCount + 1 });
        this.commentBody.set('');
        this.busy.set(false);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }

  onCreated(): void {
    const post = this.post();
    if (post) {
      this.post.set({ ...post, commentCount: post.commentCount + 1 });
    }
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
