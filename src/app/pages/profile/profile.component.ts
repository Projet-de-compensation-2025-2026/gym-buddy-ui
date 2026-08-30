import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { FriendsApi } from '../../api/friends-api.service';
import { ProfilesApi } from '../../api/profiles-api.service';
import { readApiError } from '../../api/models';
import type { GetFriendships200DataItem, GetProfilesHandle200 } from '../../api/generated/model';
import { AuthSession } from '../../auth/auth-session.service';

type ProfileRelation = 'none' | 'outgoing' | 'incoming' | 'accepted' | 'blocked';

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfilePage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ProfilesApi);
  private readonly friends = inject(FriendsApi);
  protected readonly session = inject(AuthSession);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly profile = signal<GetProfilesHandle200 | null>(null);
  readonly relation = signal<ProfileRelation>('none');
  readonly relationRow = signal<GetFriendships200DataItem | null>(null);
  readonly busy = signal(false);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const handle = params.get('handle');
      if (!handle) {
        this.error.set('Profile not found.');
        this.loading.set(false);
        return;
      }
      this.load(handle);
    });
  }

  load(handle: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.profile.set(null);
    this.relation.set('none');
    this.relationRow.set(null);
    this.api.byHandle(handle).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        if (this.isOwner(profile)) {
          this.loading.set(false);
          return;
        }
        this.loadRelation(handle);
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.loading.set(false);
      },
    });
  }

  addFriend(profile: GetProfilesHandle200): void {
    this.run(this.friends.request({ handle: profile.handle }), () => this.load(profile.handle));
  }

  accept(): void {
    const row = this.relationRow();
    const handle = this.profile()?.handle;
    if (!row || !handle) {
      return;
    }
    this.run(this.friends.accept(row.id), () => this.load(handle));
  }

  decline(): void {
    const row = this.relationRow();
    const handle = this.profile()?.handle;
    if (!row || !handle) {
      return;
    }
    this.run(this.friends.decline(row.id), () => this.load(handle));
  }

  cancelOrUnfriend(): void {
    const row = this.relationRow();
    const handle = this.profile()?.handle;
    if (!row || !handle) {
      return;
    }
    this.run(this.friends.remove(row.id), () => this.load(handle));
  }

  block(): void {
    const userId = this.relationRow()?.peer.userId;
    if (!userId) {
      return;
    }
    this.run(this.friends.block({ userId }), () => {
      this.relation.set('blocked');
      this.relationRow.set(null);
      this.busy.set(false);
    });
  }

  initials(profile: GetProfilesHandle200): string {
    const source = profile.displayName || profile.handle;
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  windowsLabel(profile: GetProfilesHandle200): string {
    const windows = profile.preferredWindows ?? [];
    if (windows.length === 0) {
      return 'Flexible';
    }
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return windows
      .map((window) => `${days[window.weekday] ?? window.weekday} ${window.start}–${window.end}`)
      .join(', ');
  }

  isOwner(profile: GetProfilesHandle200): boolean {
    return this.session.handle()?.toLowerCase() === profile.handle.toLowerCase();
  }

  private loadRelation(handle: string): void {
    forkJoin({
      incoming: this.friends.list({ filter: 'incoming', size: 50 }),
      outgoing: this.friends.list({ filter: 'outgoing', size: 50 }),
      accepted: this.friends.list({ filter: 'accepted', size: 50 }),
    }).subscribe({
      next: (pages) => {
        const match = (rows: GetFriendships200DataItem[]) =>
          rows.find((row) => row.peer.handle.toLowerCase() === handle.toLowerCase());
        const accepted = match(pages.accepted.data);
        const incoming = match(pages.incoming.data);
        const outgoing = match(pages.outgoing.data);
        if (accepted) {
          this.relation.set('accepted');
          this.relationRow.set(accepted);
        } else if (incoming) {
          this.relation.set('incoming');
          this.relationRow.set(incoming);
        } else if (outgoing) {
          this.relation.set('outgoing');
          this.relationRow.set(outgoing);
        } else {
          this.relation.set('none');
          this.relationRow.set(null);
        }
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(readApiError(err));
        this.loading.set(false);
      },
    });
  }

  private run(request: Observable<unknown>, onDone: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: () => onDone(),
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }
}
