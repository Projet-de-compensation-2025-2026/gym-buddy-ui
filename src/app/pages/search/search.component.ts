import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventsApi } from '../../api/events-api.service';
import { FriendsApi } from '../../api/friends-api.service';
import { MediaApi } from '../../api/media-api.service';
import { readApiError } from '../../api/models';
import { SearchApi } from '../../api/search-api.service';
import type {
  GetSearchEvents200DataItem,
  GetSearchPeople200DataItem,
  GetSearchPeopleExperience,
} from '../../api/generated/model';

export type SearchTab = 'people' | 'events';

@Component({
  selector: 'app-search',
  imports: [RouterLink],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
})
export class SearchPage {
  private readonly search = inject(SearchApi);
  private readonly friends = inject(FriendsApi);
  private readonly eventsApi = inject(EventsApi);
  private readonly media = inject(MediaApi);

  readonly tab = signal<SearchTab>('people');
  readonly q = signal('');
  readonly city = signal('');
  readonly radiusKm = signal(10);
  readonly sports = signal<string[]>([]);
  readonly sportDraft = signal('');
  readonly experience = signal<GetSearchPeopleExperience[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly people = signal<GetSearchPeople200DataItem[]>([]);
  readonly events = signal<GetSearchEvents200DataItem[]>([]);
  readonly avatarUrls = signal<Record<string, string>>({});
  readonly busyKey = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  setTab(tab: SearchTab): void {
    this.tab.set(tab);
    this.reload();
  }

  applyFilters(): void {
    this.reload();
  }

  toggleExperience(level: GetSearchPeopleExperience): void {
    const current = this.experience();
    this.experience.set(
      current.includes(level) ? current.filter((item) => item !== level) : [...current, level],
    );
  }

  addSport(): void {
    const tag = this.sportDraft().trim().toLowerCase();
    if (tag.length < 2 || this.sports().includes(tag)) {
      return;
    }
    this.sports.set([...this.sports(), tag]);
    this.sportDraft.set('');
  }

  removeSport(sport: string): void {
    this.sports.set(this.sports().filter((item) => item !== sport));
  }

  onQuery(event: Event): void {
    this.q.set(inputValue(event));
    this.reload();
  }

  onQueryEnter(event: Event): void {
    event.preventDefault();
    this.q.set(inputValue(event));
    this.reload();
  }

  onCity(event: Event): void {
    const target = event.target;
    this.city.set(target instanceof HTMLInputElement ? target.value : '');
  }

  onRadius(event: Event): void {
    const target = event.target;
    const value = target instanceof HTMLInputElement ? Number(target.value) : 10;
    this.radiusKm.set(Number.isFinite(value) ? value : 10);
  }

  onSportDraft(event: Event): void {
    const target = event.target;
    this.sportDraft.set(target instanceof HTMLInputElement ? target.value : '');
  }

  connect(hit: GetSearchPeople200DataItem): void {
    this.busyKey.set(hit.handle);
    this.error.set(null);
    this.friends.request({ handle: hit.handle }).subscribe({
      next: () => {
        this.busyKey.set(null);
        this.reload();
      },
      error: (err: unknown) => {
        this.busyKey.set(null);
        this.error.set(readApiError(err));
      },
    });
  }

  join(hit: GetSearchEvents200DataItem): void {
    this.busyKey.set(hit.id);
    this.error.set(null);
    this.eventsApi.apply(hit.id).subscribe({
      next: () => {
        this.busyKey.set(null);
        this.reload();
      },
      error: (err: unknown) => {
        this.busyKey.set(null);
        this.error.set(readApiError(err));
      },
    });
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  distanceLabel(km: number | null | undefined): string | null {
    if (km == null) {
      return null;
    }
    return `${Math.round(km)} km away`;
  }

  eventWhen(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  spots(hit: GetSearchEvents200DataItem): string {
    if (hit.remainingSeats <= 0) {
      return 'Full';
    }
    return `${hit.remainingSeats} spot${hit.remainingSeats === 1 ? '' : 's'} left`;
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(null);
    if (this.tab() === 'people') {
      this.search.people(this.peopleParams()).subscribe({
        next: (page) => {
          this.people.set(page.data);
          this.events.set([]);
          this.loading.set(false);
          this.loadAvatars(page.data);
        },
        error: (err: unknown) => {
          this.error.set(readApiError(err));
          this.loading.set(false);
        },
      });
      return;
    }
    this.search.events(this.eventParams()).subscribe({
      next: (page) => {
        this.events.set(page.data);
        this.people.set([]);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.loading.set(false);
      },
    });
  }

  private peopleParams() {
    const sports = this.sports();
    const experience = this.experience();
    return {
      q: this.q().trim() || undefined,
      sports: sports.length ? sports : undefined,
      experience: experience.length === 1 ? experience[0] : undefined,
      city: this.city().trim() || undefined,
      radiusKm: this.city().trim() ? this.radiusKm() : undefined,
      size: 20,
    };
  }

  private eventParams() {
    const sports = this.sports();
    return {
      q: this.q().trim() || undefined,
      activity: sports.length === 1 ? sports[0] : undefined,
      radiusKm: this.city().trim() ? this.radiusKm() : undefined,
      size: 20,
    };
  }

  private loadAvatars(rows: GetSearchPeople200DataItem[]): void {
    for (const row of rows) {
      const mediaId = row.avatarMediaId;
      if (!mediaId || this.avatarUrls()[mediaId]) {
        continue;
      }
      this.media.url(mediaId).subscribe({
        next: (signed) => this.avatarUrls.update((urls) => ({ ...urls, [mediaId]: signed.url })),
        error: () => undefined,
      });
    }
  }
}

function inputValue(event: Event): string {
  const target = event.target;
  return target instanceof HTMLInputElement ? target.value : '';
}
