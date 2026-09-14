import { inject, Injectable } from '@angular/core';
import {
  Observable,
  from,
  throwError,
  timer,
  take,
  exhaustMap,
  catchError,
  of,
  filter,
  throwIfEmpty,
  timeout,
} from 'rxjs';
import { GymBuddyAPIService } from './generated/client';
import type { GetMediaIdUrl200, PostMedia201, PostMediaBody } from './generated/model';

const ALLOWED_IMAGE: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class MediaApi {
  private readonly client = inject(GymBuddyAPIService);

  create(body: PostMediaBody): Observable<PostMedia201> {
    return this.client.postMedia(body);
  }

  url(id: string): Observable<GetMediaIdUrl200> {
    return this.client.getMediaIdUrl(id);
  }

  remove(id: string): Observable<void> {
    return this.client.deleteMediaId(id);
  }

  waitReady(id: string): Observable<GetMediaIdUrl200> {
    return timer(0, 400).pipe(
      take(25),
      exhaustMap(() => this.url(id).pipe(catchError(() => of(null)))),
      filter((value): value is GetMediaIdUrl200 => value !== null),
      take(1),
      throwIfEmpty(() => new Error('Media is still processing. Try again in a moment.')),
      timeout({ first: 15_000 }),
    );
  }

  putBytes(uploadUrl: string, file: File): Observable<void> {
    return from(
      fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
        signal: AbortSignal.timeout(30_000),
      }).then((response) => {
        if (!response.ok) {
          throw new Error('object storage rejected the upload');
        }
      }),
    );
  }
}

export function imageMime(file: File): PostMediaBody['mime'] | null {
  if (ALLOWED_IMAGE.has(file.type)) {
    return file.type as PostMediaBody['mime'];
  }
  return null;
}

export function rejectIfTooLarge(file: File): Observable<never> | null {
  if (file.size > MAX_MEDIA_BYTES) {
    return throwError(() => new Error('Image must be 8 MiB or smaller.'));
  }
  if (file.size < 1) {
    return throwError(() => new Error('Image is empty.'));
  }
  return null;
}
