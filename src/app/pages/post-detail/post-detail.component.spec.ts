import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { sampleComment } from '../../api/comments-api.service.spec';
import { samplePost } from '../../api/posts-api.service.spec';
import { PostDetailPage } from './post-detail.component';

describe('PostDetailPage', () => {
  async function setup(): Promise<{
    root: HTMLElement;
    http: HttpTestingController;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [PostDetailPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: samplePost().id }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PostDetailPage);
    fixture.detectChanges();
    return {
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      detect: () => fixture.detectChanges(),
    };
  }

  function flushPostAndComments(
    http: HttpTestingController,
    detect: () => void,
    comments = [sampleComment()],
  ): void {
    http.expectOne(`${environment.apiBaseUrl}/posts/${samplePost().id}`).flush(samplePost());
    detect();
    http
      .expectOne(`${environment.apiBaseUrl}/posts/${samplePost().id}/comments?size=20`)
      .flush({ data: comments, page: { next: null, size: 20 } });
    detect();
  }

  it('FS-POST-02 loads a visible post', async () => {
    const { root, http, detect } = await setup();
    flushPostAndComments(http, detect, []);
    expect(root.querySelector('[data-testid="post-body"]')?.textContent).toContain(
      'Crushed leg day',
    );
    expect(root.querySelector('[data-testid="comments-empty"]')).toBeTruthy();
    http.verify();
  });

  it('FS-POST-05 reposts from the post chrome', async () => {
    const { root, http, detect } = await setup();
    flushPostAndComments(http, detect, []);
    (root.querySelector('[data-testid="repost-post"]') as HTMLButtonElement).click();
    const req = http.expectOne(`${environment.apiBaseUrl}/posts/${samplePost().id}/reposts`);
    expect(req.request.method).toBe('POST');
    req.flush(
      { ...samplePost(), reposted: true, repostCount: 1 },
      { status: 201, statusText: 'Created' },
    );
    detect();
    expect(root.querySelector('[data-testid="repost-post"]')?.textContent).toContain('Reposted');
    http.verify();
  });

  it('FS-CMT-01 posts a root comment on the thread', async () => {
    const { root, http, detect } = await setup();
    flushPostAndComments(http, detect, []);
    const input = root.querySelector('[data-testid="comment-composer"]') as HTMLInputElement;
    input.value = 'Huge milestone!';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    detect();
    (root.querySelector('[data-testid="submit-comment"]') as HTMLButtonElement).click();
    const req = http.expectOne(`${environment.apiBaseUrl}/posts/${samplePost().id}/comments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ body: 'Huge milestone!' });
    req.flush(sampleComment(), { status: 201, statusText: 'Created' });
    detect();
    expect(
      root.querySelector('[data-testid="comment-thread"] [data-testid="comment-body"]')
        ?.textContent,
    ).toContain('Huge milestone');
    http.verify();
  });

  it('FS-CMT-05 shows a tombstone for a deleted comment', async () => {
    const { root, http, detect } = await setup();
    flushPostAndComments(http, detect, [
      { ...sampleComment(), deleted: true, body: 'comment deleted' },
    ]);
    expect(root.querySelector('[data-testid="comment-tombstone"]')?.textContent).toContain(
      'This comment was deleted by the user.',
    );
    http.verify();
  });

  it('FS-CMT-06 loads replies on demand', async () => {
    const { root, http, detect } = await setup();
    flushPostAndComments(http, detect);
    (root.querySelector('[data-testid="load-replies"]') as HTMLButtonElement).click();
    const req = http.expectOne(
      `${environment.apiBaseUrl}/comments/${sampleComment().id}/replies?size=20`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [
        {
          ...sampleComment(),
          id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          parentId: sampleComment().id,
          depth: 1,
          body: 'Thanks Mike!',
          replyCount: 0,
        },
      ],
      page: { next: null, size: 20 },
    });
    detect();
    expect(root.textContent).toContain('Thanks Mike!');
    http.verify();
  });
});
