import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { sampleFeedItem } from '../../api/feed-api.service.spec';
import { samplePost } from '../../api/posts-api.service.spec';
import { AuthSession } from '../../auth/auth-session.service';
import { HomePage } from './home.component';

describe('HomePage', () => {
  async function setup(signedIn = true): Promise<{
    root: HTMLElement;
    http: HttpTestingController;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    if (signedIn) {
      const payload = btoa(
        JSON.stringify({ sub: '11111111-1111-1111-1111-111111111111', handle: 'alex' }),
      )
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      TestBed.inject(AuthSession).setAccessToken(`hdr.${payload}.sig`);
    }

    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    return {
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      detect: () => fixture.detectChanges(),
    };
  }

  function flushFeed(
    http: HttpTestingController,
    body: {
      data: ReturnType<typeof sampleFeedItem>[];
      page: { next: string | null; size: number };
    } = {
      data: [],
      page: { next: null, size: 20 },
    },
  ): void {
    const req = http.expectOne(
      (r) => r.method === 'GET' && r.url.startsWith(`${environment.apiBaseUrl}/feed`),
    );
    req.flush(body);
  }

  it('shows the composer when signed in', async () => {
    const { root, http, detect } = await setup();
    flushFeed(http);
    detect();
    expect(root.querySelector('[data-testid="post-composer"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="composer-body"]')).toBeTruthy();
    http.verify();
  });

  it('FS-FEED-07 shows a suggestions CTA when the feed is empty', async () => {
    const { root, http, detect } = await setup();
    flushFeed(http);
    detect();
    const cta = root.querySelector('[data-testid="empty-feed-cta"]') as HTMLAnchorElement;
    expect(cta).toBeTruthy();
    expect(cta.getAttribute('href') ?? cta.getAttribute('ng-reflect-router-link') ?? '').toContain(
      'friends/suggestions',
    );
    http.verify();
  });

  it('does not ship a Video control in the composer', async () => {
    const { root, http, detect } = await setup();
    flushFeed(http);
    detect();
    expect(root.querySelector('[data-testid="attach-image"]')).toBeTruthy();
    expect(root.textContent).not.toContain('Video');
    http.verify();
  });

  it('FS-FEED-01 renders friends posts and reposts from GET /feed', async () => {
    const { root, http, detect } = await setup();
    const friend = sampleFeedItem({
      post: { ...samplePost(), body: 'blake pr' },
    });
    const repost = sampleFeedItem({
      id: 'cccccccccccccccccccccccccccccccc',
      kind: 'repost',
      actor: {
        userId: '22222222-2222-2222-2222-222222222222',
        handle: 'blake',
        displayName: 'demo.blake',
        avatarMediaId: null,
      },
      post: { ...samplePost(), id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', body: 'casey public' },
    });
    flushFeed(http, { data: [repost, friend], page: { next: null, size: 20 } });
    detect();
    expect(root.querySelector('[data-testid="repost-actor"]')?.textContent).toContain('reposted');
    expect(root.textContent).toContain('blake pr');
    expect(root.textContent).toContain('casey public');
    http.verify();
  });

  it('FS-POST-01 publishes a friends-visibility text post', async () => {
    const { root, http, detect } = await setup();
    flushFeed(http);
    detect();
    const textarea = root.querySelector('[data-testid="composer-body"]') as HTMLTextAreaElement;
    textarea.value = 'Crushed leg day.';
    textarea.dispatchEvent(new Event('input'));
    detect();

    (root.querySelector('[data-testid="publish-post"]') as HTMLButtonElement).click();
    const req = http.expectOne(`${environment.apiBaseUrl}/posts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      body: 'Crushed leg day.',
      visibility: 'friends',
    });
    req.flush(samplePost(), { status: 201, statusText: 'Created' });
    detect();

    expect(root.querySelector('[data-testid="post-body"]')?.textContent).toContain(
      'Crushed leg day',
    );
    http.verify();
  });

  it('FS-POST-07 likes a published post', async () => {
    const { root, http, detect } = await setup();
    flushFeed(http);
    detect();
    const textarea = root.querySelector('[data-testid="composer-body"]') as HTMLTextAreaElement;
    textarea.value = 'PR day';
    textarea.dispatchEvent(new Event('input'));
    detect();
    (root.querySelector('[data-testid="publish-post"]') as HTMLButtonElement).click();
    http.expectOne(`${environment.apiBaseUrl}/posts`).flush(samplePost(), {
      status: 201,
      statusText: 'Created',
    });
    detect();

    (root.querySelector('[data-testid="like-post"]') as HTMLButtonElement).click();
    const like = http.expectOne(`${environment.apiBaseUrl}/posts/${samplePost().id}/like`);
    expect(like.request.method).toBe('PUT');
    like.flush(null, { status: 204, statusText: 'No Content' });
    detect();
    expect(root.querySelector('[data-testid="like-count"]')?.textContent?.trim()).toBe('1 Like');
    http.verify();
  });
});
