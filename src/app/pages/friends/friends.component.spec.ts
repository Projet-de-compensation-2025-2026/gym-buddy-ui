import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { FriendsPage } from './friends.component';

describe('FriendsPage', () => {
  async function setup(): Promise<{
    root: HTMLElement;
    http: HttpTestingController;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [FriendsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(FriendsPage);
    fixture.detectChanges();
    return {
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      detect: () => fixture.detectChanges(),
    };
  }

  it('FS-FRND-07 lists inbound, outbound, and accepted friends', async () => {
    const { root, http, detect } = await setup();
    expect(root.querySelector('[data-testid="friends-loading"]')?.textContent).toContain('Loading');

    flushLists(http, {
      incoming: [sample('pending', 'incoming', 'acarter_fit', 'Alex Carter')],
      outgoing: [sample('pending', 'outgoing', 'samlifts', 'Sam Johnson')],
      accepted: [sample('accepted', 'outgoing', 'jordan_squats', 'Jordan Lee', ['Legs', 'Cardio'])],
    });
    detect();

    expect(root.querySelector('[data-testid="pending-inbound"]')?.textContent).toContain(
      'Alex Carter',
    );
    expect(root.querySelector('[data-testid="pending-outbound"]')?.textContent).toContain(
      'Sam Johnson',
    );
    expect(root.querySelector('[data-testid="friends-list"]')?.textContent).toContain('Jordan Lee');
    expect(root.textContent).toContain('Legs');
    http.verify();
  });

  it('FS-FRND-02 accepts an inbound request', async () => {
    const { root, http, detect } = await setup();
    const inbound = sample('pending', 'incoming', 'acarter_fit', 'Alex Carter');
    flushLists(http, { incoming: [inbound], outgoing: [], accepted: [] });
    detect();

    (root.querySelector('[data-testid="accept-friend"]') as HTMLButtonElement).click();
    const accept = http.expectOne(`${environment.apiBaseUrl}/friendships/${inbound.id}/accept`);
    expect(accept.request.method).toBe('POST');
    accept.flush({ ...inbound, status: 'accepted' });
    flushLists(http, {
      incoming: [],
      outgoing: [],
      accepted: [{ ...inbound, status: 'accepted' }],
    });
    detect();

    expect(root.querySelector('[data-testid="friends-list"]')?.textContent).toContain(
      'Alex Carter',
    );
    http.verify();
  });

  it('FS-FRND-03 cancels an outbound request', async () => {
    const { root, http, detect } = await setup();
    const outbound = sample('pending', 'outgoing', 'samlifts', 'Sam Johnson');
    flushLists(http, { incoming: [], outgoing: [outbound], accepted: [] });
    detect();

    (root.querySelector('[data-testid="cancel-request"]') as HTMLButtonElement).click();
    const del = http.expectOne(`${environment.apiBaseUrl}/friendships/${outbound.id}`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    flushLists(http, { incoming: [], outgoing: [], accepted: [] });
    detect();
    http.verify();
  });

  it('FS-FRND-04 and FS-FRND-05 unfriend and block', async () => {
    const { root, http, detect } = await setup();
    const friend = sample('accepted', 'outgoing', 'jordan_squats', 'Jordan Lee', ['Legs']);
    flushLists(http, { incoming: [], outgoing: [], accepted: [friend] });
    detect();

    (root.querySelector('[data-testid="unfriend"]') as HTMLButtonElement).click();
    const del = http.expectOne(`${environment.apiBaseUrl}/friendships/${friend.id}`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    flushLists(http, { incoming: [], outgoing: [], accepted: [friend] });
    detect();

    (root.querySelector('[data-testid="block-friend"]') as HTMLButtonElement).click();
    const block = http.expectOne(`${environment.apiBaseUrl}/blocks`);
    expect(block.request.body).toEqual({ userId: friend.peer.userId });
    block.flush(null, { status: 204, statusText: 'No Content' });
    flushLists(http, { incoming: [], outgoing: [], accepted: [] });
    detect();
    http.verify();
  });

  it('filters My Friends by handle or display name', async () => {
    const { root, http, detect } = await setup();
    flushLists(http, {
      incoming: [],
      outgoing: [],
      accepted: [
        sample('accepted', 'outgoing', 'jordan_squats', 'Jordan Lee'),
        sample('accepted', 'outgoing', 'taylor_lifts', 'Taylor Kim'),
      ],
    });
    detect();

    const input = root.querySelector('[data-testid="friends-search"]') as HTMLInputElement;
    input.value = 'taylor';
    input.dispatchEvent(new Event('input'));
    detect();

    expect(root.querySelector('[data-testid="friends-list"]')?.textContent).toContain('Taylor Kim');
    expect(root.querySelector('[data-testid="friends-list"]')?.textContent).not.toContain(
      'Jordan Lee',
    );
    http.verify();
  });
});

function flushLists(
  http: HttpTestingController,
  pages: {
    incoming: ReturnType<typeof sample>[];
    outgoing: ReturnType<typeof sample>[];
    accepted: ReturnType<typeof sample>[];
  },
): void {
  const pending = http.match((req) => req.method === 'GET' && req.url.endsWith('/friendships'));
  expect(pending.length).toBe(3);
  for (const req of pending) {
    const filter = req.request.params.get('filter');
    const data =
      filter === 'incoming'
        ? pages.incoming
        : filter === 'outgoing'
          ? pages.outgoing
          : pages.accepted;
    req.flush({ data, page: { size: 50, next: null } });
  }
}

function sample(
  status: 'pending' | 'accepted',
  direction: 'incoming' | 'outgoing',
  handle: string,
  displayName: string,
  sports: string[] = [],
) {
  return {
    id: `id-${handle}`,
    requesterId: '11111111-1111-1111-1111-111111111111',
    addresseeId: '22222222-2222-2222-2222-222222222222',
    status,
    createdAt: '2026-08-30T12:00:00Z',
    direction,
    peer: {
      userId: `user-${handle}`,
      handle,
      displayName,
      sports,
    },
  };
}
