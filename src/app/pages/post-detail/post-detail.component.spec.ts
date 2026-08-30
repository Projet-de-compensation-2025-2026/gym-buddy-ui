import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
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

  it('FS-POST-02 loads a visible post', async () => {
    const { root, http, detect } = await setup();
    const req = http.expectOne(`${environment.apiBaseUrl}/posts/${samplePost().id}`);
    expect(req.request.method).toBe('GET');
    req.flush(samplePost());
    detect();
    expect(root.querySelector('[data-testid="post-body"]')?.textContent).toContain(
      'Crushed leg day',
    );
    expect(root.querySelector('[data-testid="comments-placeholder"]')).toBeTruthy();
    http.verify();
  });

  it('FS-POST-05 reposts from the post chrome', async () => {
    const { root, http, detect } = await setup();
    http.expectOne(`${environment.apiBaseUrl}/posts/${samplePost().id}`).flush(samplePost());
    detect();
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
});
