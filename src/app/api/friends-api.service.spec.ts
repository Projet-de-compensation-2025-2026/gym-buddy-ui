import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { FriendsApi } from './friends-api.service';

describe('FriendsApi', () => {
  let api: FriendsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(FriendsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists friendships through the generated client', () => {
    let size = 0;
    api.list({ filter: 'incoming', size: 20 }).subscribe((page) => {
      size = page.data.length;
    });

    const req = http.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url === `${environment.apiBaseUrl}/friendships` &&
        request.params.get('filter') === 'incoming' &&
        request.params.get('size') === '20',
    );
    req.flush({
      data: [sampleFriendship()],
      page: { size: 20, next: null },
    });
    expect(size).toBe(1);
  });

  it('FS-FRND-01 posts a friend request by handle', () => {
    api.request({ handle: 'blake' }).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/friendships`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ handle: 'blake' });
    req.flush(sampleFriendship(), { status: 201, statusText: 'Created' });
  });

  it('FS-FRND-02 posts accept and decline', () => {
    const id = sampleFriendship().id;
    api.accept(id).subscribe();
    const accept = http.expectOne(`${environment.apiBaseUrl}/friendships/${id}/accept`);
    expect(accept.request.method).toBe('POST');
    accept.flush({ ...sampleFriendship(), status: 'accepted' });

    api.decline(id).subscribe();
    const decline = http.expectOne(`${environment.apiBaseUrl}/friendships/${id}/decline`);
    expect(decline.request.method).toBe('POST');
    decline.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('FS-FRND-04 deletes a friendship and FS-FRND-05 posts a block', () => {
    const id = sampleFriendship().id;
    api.remove(id).subscribe();
    const del = http.expectOne(`${environment.apiBaseUrl}/friendships/${id}`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });

    api.block({ userId: sampleFriendship().peer.userId }).subscribe();
    const block = http.expectOne(`${environment.apiBaseUrl}/blocks`);
    expect(block.request.method).toBe('POST');
    expect(block.request.body).toEqual({ userId: sampleFriendship().peer.userId });
    block.flush(null, { status: 204, statusText: 'No Content' });
  });
});

function sampleFriendship() {
  return {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    requesterId: '11111111-1111-1111-1111-111111111111',
    addresseeId: '22222222-2222-2222-2222-222222222222',
    status: 'pending' as const,
    createdAt: '2026-08-30T12:00:00Z',
    direction: 'outgoing' as const,
    peer: {
      userId: '22222222-2222-2222-2222-222222222222',
      handle: 'blake',
      displayName: 'Blake',
      sports: ['running'],
    },
  };
}
