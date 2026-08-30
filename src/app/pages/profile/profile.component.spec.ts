import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../../auth/auth-session.service';
import { ProfilePage } from './profile.component';

describe('ProfilePage', () => {
  async function setup(
    handle = 'blake',
    viewer = 'viewer',
  ): Promise<{
    root: HTMLElement;
    http: HttpTestingController;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ handle })) },
        },
      ],
    }).compileComponents();

    TestBed.inject(AuthSession).setAccessToken(fakeJwt(viewer));
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();
    return {
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      detect: () => fixture.detectChanges(),
    };
  }

  it('shows a loading state then a private stub without bio, sports, or location', async () => {
    const { root, http, detect } = await setup('blake');
    expect(root.querySelector('[data-testid="profile-loading"]')?.textContent).toContain('Loading');

    const req = http.expectOne(`${environment.apiBaseUrl}/profiles/blake`);
    expect(req.request.method).toBe('GET');
    req.flush({
      view: 'stub',
      handle: 'blake',
      visibility: 'private',
      avatarMediaId: null,
    });
    detect();
    flushFriendLists(http);
    detect();

    expect(root.querySelector('[data-testid="profile-stub"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="profile-bio"]')).toBeNull();
    expect(root.textContent).not.toContain('secret-bio');
    expect(root.textContent).not.toContain('Austin');
    expect(root.querySelector('[data-testid="request-friend"]')).toBeTruthy();
    http.verify();
  });

  it('FS-PROF-04 renders a full public profile with bio and friend count', async () => {
    const { root, http, detect } = await setup('blake');
    http.expectOne(`${environment.apiBaseUrl}/profiles/blake`).flush({
      view: 'full',
      handle: 'blake',
      displayName: 'Blake',
      visibility: 'public',
      bio: 'Looking for a spotter',
      sports: ['running'],
      city: 'Austin, TX',
      friendCount: 45,
    });
    detect();
    flushFriendLists(http);
    detect();

    expect(root.querySelector('[data-testid="profile-full"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="profile-bio"]')?.textContent).toContain(
      'Looking for a spotter',
    );
    expect(root.querySelector('[data-testid="profile-friend-count"]')?.textContent).toContain('45');
    http.verify();
  });

  it('FS-FRND-01 posts Add Friend with the profile handle', async () => {
    const { root, http, detect } = await setup('blake');
    http.expectOne(`${environment.apiBaseUrl}/profiles/blake`).flush({
      view: 'full',
      handle: 'blake',
      displayName: 'Blake',
      visibility: 'public',
    });
    detect();
    flushFriendLists(http);
    detect();

    (root.querySelector('[data-testid="add-friend"]') as HTMLButtonElement).click();
    const post = http.expectOne(`${environment.apiBaseUrl}/friendships`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ handle: 'blake' });
    post.flush(
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        requesterId: '11111111-1111-1111-1111-111111111111',
        addresseeId: '22222222-2222-2222-2222-222222222222',
        status: 'pending',
        createdAt: '2026-08-30T12:00:00Z',
        direction: 'outgoing',
        peer: {
          userId: '22222222-2222-2222-2222-222222222222',
          handle: 'blake',
          displayName: 'Blake',
        },
      },
      { status: 201, statusText: 'Created' },
    );
    http.expectOne(`${environment.apiBaseUrl}/profiles/blake`).flush({
      view: 'full',
      handle: 'blake',
      displayName: 'Blake',
      visibility: 'public',
    });
    detect();
    flushFriendLists(http, {
      outgoing: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          requesterId: '11111111-1111-1111-1111-111111111111',
          addresseeId: '22222222-2222-2222-2222-222222222222',
          status: 'pending',
          createdAt: '2026-08-30T12:00:00Z',
          direction: 'outgoing',
          peer: {
            userId: '22222222-2222-2222-2222-222222222222',
            handle: 'blake',
            displayName: 'Blake',
          },
        },
      ],
    });
    detect();
    expect(root.querySelector('[data-testid="cancel-request"]')).toBeTruthy();
    http.verify();
  });

  it('does not load friendship lists for the owner', async () => {
    const { root, http, detect } = await setup('blake', 'blake');
    http.expectOne(`${environment.apiBaseUrl}/profiles/blake`).flush({
      view: 'full',
      handle: 'blake',
      displayName: 'Blake',
      visibility: 'public',
    });
    detect();
    expect(root.querySelector('[data-testid="add-friend"]')).toBeNull();
    expect(root.textContent).toContain('Edit Profile');
    http.verify();
  });

  it('does not invent Flexible when preferredWindows is empty', async () => {
    const { root, http, detect } = await setup('blake', 'blake');
    http.expectOne(`${environment.apiBaseUrl}/profiles/blake`).flush({
      view: 'full',
      handle: 'blake',
      displayName: 'Blake',
      visibility: 'public',
      preferredWindows: [],
    });
    detect();
    expect(root.textContent).not.toContain('Flexible');
    expect(root.querySelector('[data-testid="profile-windows"]')).toBeNull();
    http.verify();
  });
});

function flushFriendLists(
  http: HttpTestingController,
  pages: {
    incoming?: unknown[];
    outgoing?: unknown[];
    accepted?: unknown[];
  } = {},
): void {
  const pending = http.match((req) => req.method === 'GET' && req.url.endsWith('/friendships'));
  expect(pending.length).toBe(3);
  for (const req of pending) {
    const filter = req.request.params.get('filter');
    const data =
      filter === 'incoming'
        ? (pages.incoming ?? [])
        : filter === 'outgoing'
          ? (pages.outgoing ?? [])
          : (pages.accepted ?? []);
    req.flush({ data, page: { size: 50, next: null } });
  }
}

function fakeJwt(handle: string): string {
  const payload = btoa(JSON.stringify({ sub: '11111111-1111-1111-1111-111111111111', handle }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `hdr.${payload}.sig`;
}
