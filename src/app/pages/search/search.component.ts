import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FriendsApi } from '../../api/friends-api.service';
import { MediaApi } from '../../api/media-api.service';
import { ProfilesApi } from '../../api/profiles-api.service';
import { readApiError } from '../../api/models';
import { SearchApi } from '../../api/search-api.service';
import type {
  GetProfilesMe200,
  GetSearchEvents200DataItem,
  GetSearchPeople200DataItem,
  GetSearchPeopleExperience,
  GetSearchPeopleFriendState,
  GetSearchEventsSort,
} from '../../api/generated/model';

export type SearchTab = 'people' | 'events';

@Component({
  selector: 'app-search',
  imports: [RouterLink, FormsModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
})
export class SearchPage {
  private readonly search = inject(SearchApi);
  private readonly friends = inject(FriendsApi);
  private readonly media = inject(MediaApi);
  private readonly profiles = inject(ProfilesApi);
  private reloadSeq = 0;

  readonly tab = signal<SearchTab>('people');
  readonly q = signal('');
  readonly city = signal('');
  readonly radiusKm = signal(10);
  readonly distanceEnabled = signal(false);
  readonly hasCoordinates = signal(false);
  readonly sports = signal<string[]>([]);
  readonly sportDraft = signal('');
  readonly experience = signal<GetSearchPeopleExperience | ''>('');
  readonly activity = signal('');
  readonly friendState = signal<GetSearchPeopleFriendState | ''>('');
  readonly sort = signal<GetSearchEventsSort>('relevance');
  readonly from = signal('');
  readonly to = signal('');
  readonly availableOnly = signal(false);
  readonly organizerIsFriend = signal(false);
  readonly next = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly people = signal<GetSearchPeople200DataItem[]>([]);
  readonly events = signal<GetSearchEvents200DataItem[]>([]);
  readonly avatarUrls = signal<Record<string, string>>({});
  readonly busyKey = signal<string | null>(null);

  constructor() {
    this.loadViewerThenSearch();
  }

  setTab(tab: SearchTab): void {
    this.tab.set(tab);
    if (tab === 'people' && this.sort() === 'starts_at') this.sort.set('relevance');
    this.reload();
  }

  applyFilters(): void {
    this.reload();
  }

  loadMore(): void {
    if (this.next() && !this.loading()) this.reload(true);
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

  private loadViewerThenSearch(): void {
    this.loading.set(true);
    this.profiles.me().subscribe({
      next: (profile) => {
        this.hasCoordinates.set(hasViewerCoordinates(profile));
        this.reload();
      },
      error: () => {
        this.hasCoordinates.set(false);
        this.reload();
      },
    });
  }

  private reload(append = false): void {
    if (this.tab() === 'events' && this.from() && this.to() && this.from() > this.to()) {
      this.error.set('The end date must be after the start date.');
      return;
    }
    const seq = ++this.reloadSeq;
    this.loading.set(true);
    this.error.set(null);
    if (this.tab() === 'people') {
      this.search
        .people({ ...this.peopleParams(), before: append ? (this.next() ?? undefined) : undefined })
        .subscribe({
          next: (page) => {
            if (seq !== this.reloadSeq) {
              return;
            }
            this.people.set(append ? [...this.people(), ...page.data] : page.data);
            this.next.set(page.page.next ?? null);
            this.events.set([]);
            this.loading.set(false);
            this.loadAvatars(page.data);
          },
          error: (err: unknown) => {
            if (seq !== this.reloadSeq) {
              return;
            }
            this.error.set(readApiError(err));
            this.loading.set(false);
          },
        });
      return;
    }
    this.search
      .events({ ...this.eventParams(), before: append ? (this.next() ?? undefined) : undefined })
      .subscribe({
        next: (page) => {
          if (seq !== this.reloadSeq) {
            return;
          }
          this.events.set(append ? [...this.events(), ...page.data] : page.data);
          this.next.set(page.page.next ?? null);
          this.people.set([]);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          if (seq !== this.reloadSeq) {
            return;
          }
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
      experience: experience || undefined,
      friendState: this.friendState() || undefined,
      sort: this.sort() === 'distance' ? ('distance' as const) : ('relevance' as const),
      city: this.city().trim() || undefined,
      radiusKm: this.radiusParam(),
      size: 20,
    };
  }

  private eventParams() {
    return {
      q: this.q().trim() || undefined,
      activity: this.activity().trim().toLowerCase() || undefined,
      from: this.from() ? new Date(`${this.from()}T00:00:00`).toISOString() : undefined,
      to: this.to() ? new Date(`${this.to()}T23:59:59.999`).toISOString() : undefined,
      remaining: this.availableOnly() || undefined,
      organizerIsFriend: this.organizerIsFriend() || undefined,
      sort: this.sort(),
      radiusKm: this.radiusParam(),
      size: 20,
    };
  }

  private radiusParam(): number | undefined {
    return this.hasCoordinates() && this.distanceEnabled() ? this.radiusKm() : undefined;
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

function hasViewerCoordinates(profile: GetProfilesMe200): boolean {
  return typeof profile.lat === 'number' && typeof profile.lng === 'number';
}
