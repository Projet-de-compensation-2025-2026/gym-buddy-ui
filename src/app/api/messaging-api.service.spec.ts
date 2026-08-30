import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { MessagingApi } from './messaging-api.service';

describe('MessagingApi', () => {
  let api: MessagingApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(MessagingApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('FS-MSG-09 lists the inbox through the generated client', () => {
    api.inbox({ size: 20 }).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/conversations?size=20`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], page: { next: null, size: 20 } });
  });

  it('FS-MSG-01 opens a friends-only conversation', () => {
    api.open({ userId: '22222222-2222-2222-2222-222222222222' }).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/conversations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userId: '22222222-2222-2222-2222-222222222222' });
    req.flush(sampleConversation(), { status: 201, statusText: 'Created' });
  });

  it('FS-MSG-03 posts text then lists the thread', () => {
    const id = sampleConversation().id;
    api.send(id, { type: 'text', body: 'Ready?' }).subscribe();
    const post = http.expectOne(`${environment.apiBaseUrl}/conversations/${id}/messages`);
    expect(post.request.method).toBe('POST');
    post.flush(sampleMessage(), { status: 201, statusText: 'Created' });

    api.messages(id, { size: 20 }).subscribe();
    const list = http.expectOne(`${environment.apiBaseUrl}/conversations/${id}/messages?size=20`);
    expect(list.request.method).toBe('GET');
    list.flush({ data: [sampleMessage()], page: { next: null, size: 20 } });
  });
});

export function sampleConversation() {
  return {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    peer: {
      userId: '22222222-2222-2222-2222-222222222222',
      handle: 'blake',
      displayName: 'Blake',
      avatarMediaId: null,
    },
    lastMessage: sampleMessage(),
    unreadCount: 1,
    updatedAt: '2026-08-30T12:00:00Z',
  };
}

export function sampleMessage() {
  return {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    senderId: '11111111-1111-1111-1111-111111111111',
    type: 'text' as const,
    body: 'Ready?',
    mediaId: null,
    createdAt: '2026-08-30T12:00:00Z',
    deleted: false,
  };
}
