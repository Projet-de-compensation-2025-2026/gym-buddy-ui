import { Component, effect, ElementRef, inject, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, filter, forkJoin, of, switchMap, take, throwError, timer } from 'rxjs';
import { FeedApi } from '../../api/feed-api.service';
import {
  MAX_MEDIA_BYTES,
  MediaApi,
  imageMime,
  rejectIfTooLarge,
} from '../../api/media-api.service';
import { PostsApi } from '../../api/posts-api.service';
import { readApiError } from '../../api/models';
import type {
  GetFeed200DataItem,
  GetFeed200DataItemPost,
  GetMediaIdUrl200,
  GetPostsId200,
} from '../../api/generated/model';
import { AuthSession } from '../../auth/auth-session.service';
import { PostCard } from '../../posts/post-card.component';

const MAX_IMAGES = 4;

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, PostCard],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomePage {
  protected readonly session = inject(AuthSession);
  private readonly postsApi = inject(PostsApi);
  private readonly feedApi = inject(FeedApi);
  private readonly media = inject(MediaApi);
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly body = signal('');
  readonly visibility = signal<'friends' | 'public'>('friends');
  readonly items = signal<GetFeed200DataItem[]>([]);
  readonly next = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly imageUrls = signal<Record<string, string>>({});
  readonly pendingFiles = signal<File[]>([]);
  readonly posting = signal(false);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.session.signedIn()) {
        untracked(() => {
          this.items.set([]);
          this.next.set(null);
        });
        return;
      }
      untracked(() => this.reload());
    });
  }

  openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    const next = [...this.pendingFiles()];
    for (const file of files) {
      if (next.length >= MAX_IMAGES) {
        this.error.set('A post can include at most 4 images.');
        break;
      }
      if (!imageMime(file)) {
        this.error.set('Use JPEG, PNG, or WebP images.');
        continue;
      }
      if (rejectIfTooLarge(file)) {
        this.error.set(`Image must be ${MAX_MEDIA_BYTES / (1024 * 1024)} MiB or smaller.`);
        continue;
      }
      next.push(file);
    }
    this.pendingFiles.set(next);
  }

  removePending(index: number): void {
    this.pendingFiles.set(this.pendingFiles().filter((_, i) => i !== index));
  }

  publish(): void {
    this.error.set(null);
    const text = this.body().trim();
    const files = this.pendingFiles();
    if (!text && files.length === 0) {
      this.error.set('Write something or attach an image.');
      return;
    }
    this.posting.set(true);
    const uploads$ =
      files.length === 0
        ? of([] as string[])
        : forkJoin(files.map((file) => this.uploadImage(file)));
    uploads$
      .pipe(
        switchMap((mediaIds) =>
          this.postsApi.create({
            body: text || null,
            visibility: this.visibility(),
            ...(mediaIds.length ? { mediaIds } : {}),
          }),
        ),
      )
      .subscribe({
        next: (post) => {
          this.items.set([this.asItem(post), ...this.items()]);
          this.loadImages(post);
          this.body.set('');
          this.pendingFiles.set([]);
          this.posting.set(false);
        },
        error: (err: unknown) => {
          this.posting.set(false);
          this.error.set(readApiError(err));
        },
      });
  }

  loadMore(): void {
    const before = this.next();
    if (!before || this.loadingMore()) {
      return;
    }
    this.loadingMore.set(true);
    this.feedApi.list({ before }).subscribe({
      next: (page) => {
        this.items.set([...this.items(), ...page.data]);
        this.next.set(page.page.next ?? null);
        for (const item of page.data) {
          this.loadImages(item.post);
        }
        this.loadingMore.set(false);
      },
      error: (err: unknown) => {
        this.loadingMore.set(false);
        this.error.set(readApiError(err));
      },
    });
  }

  toggleLike(post: GetPostsId200): void {
    this.busyId.set(post.id);
    const call = post.liked ? this.postsApi.unlike(post.id) : this.postsApi.like(post.id);
    call.subscribe({
      next: () => {
        this.patchPost(post.id, {
          liked: !post.liked,
          likeCount: post.likeCount + (post.liked ? -1 : 1),
        });
        this.busyId.set(null);
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.error.set(readApiError(err));
      },
    });
  }

  toggleRepost(post: GetPostsId200): void {
    this.busyId.set(post.id);
    if (post.reposted) {
      this.postsApi.unrepost(post.id).subscribe({
        next: () => {
          this.patchPost(post.id, {
            reposted: false,
            repostCount: Math.max(0, post.repostCount - 1),
          });
          this.busyId.set(null);
        },
        error: (err: unknown) => {
          this.busyId.set(null);
          this.error.set(readApiError(err));
        },
      });
      return;
    }
    this.postsApi.repost(post.id).subscribe({
      next: (updated) => {
        this.patchPost(post.id, updated);
        this.busyId.set(null);
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.error.set(readApiError(err));
      },
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.feedApi.list().subscribe({
      next: (page) => {
        this.items.set(page.data);
        this.next.set(page.page.next ?? null);
        this.loading.set(false);
        for (const item of page.data) {
          this.loadImages(item.post);
        }
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(readApiError(err));
      },
    });
  }

  private patchPost(postId: string, patch: Partial<GetFeed200DataItemPost>): void {
    this.items.set(
      this.items().map((item) =>
        item.post.id === postId ? { ...item, post: { ...item.post, ...patch } } : item,
      ),
    );
  }

  private asItem(post: GetPostsId200): GetFeed200DataItem {
    return {
      id: post.id,
      kind: 'post',
      actor: post.author,
      activityAt: post.createdAt,
      post,
    };
  }

  private uploadImage(file: File) {
    const mime = imageMime(file);
    if (!mime) {
      return throwError(() => new Error('Use JPEG, PNG, or WebP images.'));
    }
    return this.media
      .create({ kind: 'post', mime, bytes: file.size })
      .pipe(
        switchMap((created) =>
          this.media
            .putBytes(created.uploadUrl, file)
            .pipe(switchMap(() => this.waitReady(created.mediaId))),
        ),
      );
  }

  private waitReady(mediaId: string) {
    return timer(0, 400).pipe(
      take(25),
      switchMap(() => this.media.url(mediaId).pipe(catchError(() => of(null)))),
      filter((signed): signed is GetMediaIdUrl200 => signed !== null),
      take(1),
      switchMap(() => of(mediaId)),
      catchError(() =>
        throwError(() => new Error('Photo is still processing. Try again in a moment.')),
      ),
    );
  }

  private loadImages(post: { mediaIds: string[] }): void {
    for (const mediaId of post.mediaIds) {
      this.media.url(mediaId).subscribe({
        next: (signed: GetMediaIdUrl200) =>
          this.imageUrls.set({ ...this.imageUrls(), [mediaId]: signed.url }),
        error: () => undefined,
      });
    }
  }
}
