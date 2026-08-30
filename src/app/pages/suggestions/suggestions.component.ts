import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { FriendsApi } from '../../api/friends-api.service';
import { readApiError } from '../../api/models';
import { SuggestionsApi } from '../../api/suggestions-api.service';
import type { GetMatchingMe200, GetSuggestions200DataItem } from '../../api/generated/model';

@Component({
  selector: 'app-suggestions',
  imports: [RouterLink],
  templateUrl: './suggestions.component.html',
  styleUrl: './suggestions.component.css',
})
export class SuggestionsPage {
  private readonly suggestions = inject(SuggestionsApi);
  private readonly friends = inject(FriendsApi);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<GetSuggestions200DataItem[]>([]);
  readonly matching = signal<GetMatchingMe200 | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly toggling = signal(false);

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      suggestions: this.suggestions.list({ size: 20 }),
      matching: this.suggestions.matchingMe(),
    }).subscribe({
      next: (pages) => {
        this.items.set(pages.suggestions.data);
        this.matching.set(pages.matching);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.loading.set(false);
      },
    });
  }

  addFriend(card: GetSuggestions200DataItem): void {
    this.run(card.userId, this.friends.request({ userId: card.userId }), () =>
      this.remove(card.userId),
    );
  }

  dismiss(card: GetSuggestions200DataItem): void {
    this.run(card.userId, this.suggestions.dismiss(card.userId), () => this.remove(card.userId));
  }

  toggleOptIn(): void {
    const current = this.matching();
    if (!current || this.toggling()) {
      return;
    }
    this.toggling.set(true);
    this.error.set(null);
    const request = current.optedIn ? this.suggestions.optOut() : this.suggestions.optIn();
    request.subscribe({
      next: () => {
        this.suggestions.matchingMe().subscribe({
          next: (me) => {
            this.matching.set(me);
            this.toggling.set(false);
          },
          error: (err: unknown) => {
            this.error.set(readApiError(err));
            this.toggling.set(false);
          },
        });
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.toggling.set(false);
      },
    });
  }

  initials(card: GetSuggestions200DataItem): string {
    const source = card.displayName || card.handle;
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  reasonLabel(card: GetSuggestions200DataItem): string {
    return card.reason;
  }

  private remove(userId: string): void {
    this.items.set(this.items().filter((row) => row.userId !== userId));
  }

  private run(id: string, request: Observable<unknown>, onDone: () => void): void {
    this.busyId.set(id);
    this.error.set(null);
    request.subscribe({
      next: () => {
        this.busyId.set(null);
        onDone();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.error.set(readApiError(err));
      },
    });
  }
}
