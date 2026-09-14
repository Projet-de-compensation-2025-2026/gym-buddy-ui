import { DestroyRef, inject, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { readApiError } from '../../../src/app/api/models';

/** Shared cursor state; a new search cancels the previous request. */
export class PagedList<T> {
  readonly rows = signal<T[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly next = signal<string | null>(null);
  private request?: Subscription;

  constructor(
    private readonly fetch: (
      after?: string,
    ) => Observable<{ data: T[]; page: { next?: string | null } }>,
  ) {
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  load(append = false): void {
    if (append && (this.loading() || !this.next())) return;
    this.request?.unsubscribe();
    const after = append ? (this.next() ?? undefined) : undefined;
    if (!append) {
      this.rows.set([]);
      this.next.set(null);
    }
    this.loading.set(true);
    this.error.set(null);
    this.request = this.fetch(after).subscribe({
      next: (page) => {
        this.rows.update((rows) => (append ? [...rows, ...page.data] : page.data));
        this.next.set(page.page.next ?? null);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(readApiError(error));
        this.loading.set(false);
      },
    });
  }
}
