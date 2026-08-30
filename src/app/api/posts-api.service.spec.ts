import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { PostsApi } from './posts-api.service';

describe('PostsApi', () => {
  let api: PostsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PostsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('FS-POST-01 posts a text post through the generated client', () => {
    api.create({ body: 'Crushed leg day.', visibility: 'friends' }).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/posts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ body: 'Crushed leg day.', visibility: 'friends' });
    req.flush(samplePost(), { status: 201, statusText: 'Created' });
  });

  it('FS-POST-07 likes and unlikes with PUT then DELETE', () => {
    const id = samplePost().id;
    api.like(id).subscribe();
    const like = http.expectOne(`${environment.apiBaseUrl}/posts/${id}/like`);
    expect(like.request.method).toBe('PUT');
    like.flush(null, { status: 204, statusText: 'No Content' });

    api.unlike(id).subscribe();
    const unlike = http.expectOne(`${environment.apiBaseUrl}/posts/${id}/like`);
    expect(unlike.request.method).toBe('DELETE');
    unlike.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('FS-POST-05 and FS-POST-06 repost then undo', () => {
    const id = samplePost().id;
    api.repost(id).subscribe();
    const repost = http.expectOne(`${environment.apiBaseUrl}/posts/${id}/reposts`);
    expect(repost.request.method).toBe('POST');
    repost.flush(
      { ...samplePost(), reposted: true, repostCount: 1 },
      { status: 201, statusText: 'Created' },
    );

    api.unrepost(id).subscribe();
    const undo = http.expectOne(`${environment.apiBaseUrl}/posts/${id}/reposts`);
    expect(undo.request.method).toBe('DELETE');
    undo.flush(null, { status: 204, statusText: 'No Content' });
  });
});

export function samplePost() {
  return {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    author: {
      userId: '11111111-1111-1111-1111-111111111111',
      handle: 'alex',
      displayName: 'demo.alex',
      avatarMediaId: null,
    },
    body: 'Crushed leg day today! Hit a new PR on squats.',
    visibility: 'friends' as const,
    mediaIds: [] as string[],
    createdAt: '2026-08-30T12:00:00Z',
    editedAt: null,
    likeCount: 0,
    repostCount: 0,
    commentCount: 0,
    liked: false,
    reposted: false,
  };
}
