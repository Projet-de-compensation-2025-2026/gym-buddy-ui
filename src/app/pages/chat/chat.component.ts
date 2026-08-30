import { Component, inject, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { MediaApi, rejectIfTooLarge } from '../../api/media-api.service';
import { MessagingApi } from '../../api/messaging-api.service';
import { readApiError } from '../../api/models';
import type { GetConversationsIdMessages200DataItem } from '../../api/generated/model';
import { AuthSession } from '../../auth/auth-session.service';
import { environment } from '../../../environments/environment';

const POLL_MS = 10_000;
const DELETE_WINDOW_MS = 10 * 60 * 1000;

@Component({
  selector: 'app-chat',
  imports: [RouterLink],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(MessagingApi);
  private readonly media = inject(MediaApi);
  readonly session = inject(AuthSession);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly conversationId = signal<string | null>(null);
  readonly peerName = signal('Chat');
  readonly messages = signal<GetConversationsIdMessages200DataItem[]>([]);
  readonly draft = signal('');
  readonly busy = signal(false);
  readonly mediaUrls = signal<Record<string, string>>({});

  private poll: ReturnType<typeof setInterval> | null = null;
  private socket: WebSocket | null = null;

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.conversationId.set(id);
      if (!id) {
        this.error.set('Conversation not found.');
        this.loading.set(false);
        return;
      }
      this.connect(id);
      this.reload(id, true);
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  mine(row: GetConversationsIdMessages200DataItem): boolean {
    return row.senderId === this.session.userId();
  }

  canDelete(row: GetConversationsIdMessages200DataItem): boolean {
    if (!this.mine(row) || row.deleted) {
      return false;
    }
    return Date.now() - Date.parse(row.createdAt) < DELETE_WINDOW_MS;
  }

  onDraft(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  sendText(): void {
    const id = this.conversationId();
    const body = this.draft().trim();
    if (!id || body.length < 1 || body.length > 4000) {
      return;
    }
    this.busy.set(true);
    this.api.send(id, { type: 'text', body }).subscribe({
      next: () => {
        this.draft.set('');
        this.busy.set(false);
        this.reload(id, false);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }

  attachImage(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = '';
    if (!file) {
      return;
    }
    this.uploadAndSend(file, 'image');
  }

  attachAudio(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = '';
    if (!file) {
      return;
    }
    this.uploadAndSend(file, 'audio');
  }

  tombstone(row: GetConversationsIdMessages200DataItem): void {
    const id = this.conversationId();
    if (!id) {
      return;
    }
    this.api.remove(row.id).subscribe({
      next: () => this.reload(id, false),
      error: (err: unknown) => this.error.set(readApiError(err)),
    });
  }

  mediaUrl(mediaId: string | null | undefined): string | null {
    if (!mediaId) {
      return null;
    }
    return this.mediaUrls()[mediaId] ?? null;
  }

  private uploadAndSend(file: File, type: 'image' | 'audio'): void {
    const id = this.conversationId();
    if (!id) {
      return;
    }
    const tooBig = rejectIfTooLarge(file);
    if (tooBig) {
      tooBig.subscribe({ error: (err: unknown) => this.error.set(readApiError(err)) });
      return;
    }
    const mime = file.type;
    const allowedImage = mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp';
    const allowedAudio = mime === 'audio/webm' || mime === 'audio/mpeg';
    if ((type === 'image' && !allowedImage) || (type === 'audio' && !allowedAudio)) {
      this.error.set(type === 'image' ? 'Use jpeg, png, or webp.' : 'Use webm or mp3 audio.');
      return;
    }
    this.busy.set(true);
    this.media
      .create({
        kind: 'message',
        mime: mime as 'image/jpeg' | 'image/png' | 'image/webp' | 'audio/webm' | 'audio/mpeg',
        bytes: file.size,
      })
      .pipe(
        switchMap((created) =>
          this.media
            .putBytes(created.uploadUrl, file)
            .pipe(
              switchMap(() =>
                this.api.send(id, {
                  type,
                  mediaId: created.mediaId,
                  body: this.draft().trim() || null,
                }),
              ),
            ),
        ),
      )
      .subscribe({
        next: () => {
          this.draft.set('');
          this.busy.set(false);
          this.reload(id, false);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.error.set(readApiError(err));
        },
      });
  }

  private reload(id: string, first: boolean): void {
    if (first) {
      this.loading.set(true);
    }
    this.api.messages(id, { size: 50 }).subscribe({
      next: (page) => {
        const chronological = [...page.data].reverse();
        this.messages.set(chronological);
        this.loading.set(false);
        this.prefetchMedia(chronological);
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.loading.set(false);
      },
    });
  }

  private prefetchMedia(rows: GetConversationsIdMessages200DataItem[]): void {
    for (const row of rows) {
      if (!row.mediaId || row.deleted || this.mediaUrls()[row.mediaId]) {
        continue;
      }
      const mediaId = row.mediaId;
      this.media.url(mediaId).subscribe({
        next: (signed) =>
          this.mediaUrls.update((current) => ({ ...current, [mediaId]: signed.url })),
        error: () => undefined,
      });
    }
  }

  private connect(id: string): void {
    this.disconnect();
    const token = this.session.accessToken();
    if (!token) {
      return;
    }
    try {
      this.socket = new WebSocket(wsUrl(token));
      this.socket.onmessage = () => this.reload(id, false);
      this.socket.onclose = () => this.startPoll(id);
      this.socket.onerror = () => this.startPoll(id);
    } catch {
      this.startPoll(id);
    }
  }

  private startPoll(id: string): void {
    if (this.poll) {
      return;
    }
    this.poll = setInterval(() => this.reload(id, false), POLL_MS);
  }

  private disconnect(): void {
    if (this.poll) {
      clearInterval(this.poll);
      this.poll = null;
    }
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }
}

export function wsUrl(accessToken: string): string {
  const httpBase = environment.apiBaseUrl.startsWith('http')
    ? environment.apiBaseUrl
    : `${globalThis.location.origin}${environment.apiBaseUrl}`;
  const wsBase = httpBase.replace(/^http/, 'ws');
  return `${wsBase}/ws?access_token=${encodeURIComponent(accessToken)}`;
}
