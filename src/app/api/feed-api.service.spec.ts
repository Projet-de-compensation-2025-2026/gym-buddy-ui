import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { samplePost } from './posts-api.service.spec';
import { FeedApi } from './feed-api.service';
import type { GetFeed200DataItem } from './generated/model';

describe('FeedApi', () => {
  let api: FeedApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(FeedApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('FS-FEED-03 lists the friends feed through the generated client', () => {
    api.list({ size: 20 }).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/feed?size=20`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [sampleFeedItem()], page: { next: null, size: 20 } });
  });
});

export function sampleFeedItem(overrides: Partial<GetFeed200DataItem> = {}): GetFeed200DataItem {
  const post = samplePost();
  return {
    id: post.id,
    kind: 'post',
    actor: post.author,
    activityAt: post.createdAt,
    post,
    ...overrides,
  };
}
