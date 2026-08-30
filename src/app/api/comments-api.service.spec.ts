import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { CommentsApi } from './comments-api.service';

describe('CommentsApi', () => {
  let api: CommentsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(CommentsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('FS-CMT-01 posts a root comment through the generated client', () => {
    api.create(sampleComment().postId, { body: 'Huge milestone!' }).subscribe();
    const req = http.expectOne(
      `${environment.apiBaseUrl}/posts/${sampleComment().postId}/comments`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ body: 'Huge milestone!' });
    req.flush(sampleComment(), { status: 201, statusText: 'Created' });
  });

  it('FS-CMT-06 lists roots and expands replies on demand', () => {
    const postId = sampleComment().postId;
    api.list(postId, { size: 20 }).subscribe();
    const roots = http.expectOne(`${environment.apiBaseUrl}/posts/${postId}/comments?size=20`);
    expect(roots.request.method).toBe('GET');
    roots.flush({ data: [sampleComment()], page: { next: null, size: 20 } });

    api.replies(sampleComment().id).subscribe();
    const replies = http.expectOne(
      `${environment.apiBaseUrl}/comments/${sampleComment().id}/replies`,
    );
    expect(replies.request.method).toBe('GET');
    replies.flush({ data: [], page: { next: null, size: 20 } });
  });

  it('FS-CMT-07 likes and unlikes a comment with PUT then DELETE', () => {
    const id = sampleComment().id;
    api.like(id).subscribe();
    const like = http.expectOne(`${environment.apiBaseUrl}/comments/${id}/like`);
    expect(like.request.method).toBe('PUT');
    like.flush(null, { status: 204, statusText: 'No Content' });

    api.unlike(id).subscribe();
    const unlike = http.expectOne(`${environment.apiBaseUrl}/comments/${id}/like`);
    expect(unlike.request.method).toBe('DELETE');
    unlike.flush(null, { status: 204, statusText: 'No Content' });
  });
});

export function sampleComment() {
  return {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    postId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    parentId: null,
    author: {
      userId: '22222222-2222-2222-2222-222222222222',
      handle: 'blake',
      displayName: 'Mike T.',
      avatarMediaId: null,
    },
    body: 'Huge milestone! Congrats!',
    depth: 0,
    createdAt: '2026-08-30T11:00:00Z',
    deleted: false,
    likeCount: 12,
    liked: false,
    replyCount: 1,
  };
}
