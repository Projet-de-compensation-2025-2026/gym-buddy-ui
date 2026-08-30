import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SettingsProfilePage } from './settings-profile.component';

describe('SettingsProfilePage', () => {
  async function setup(): Promise<{
    page: SettingsProfilePage;
    root: HTMLElement;
    http: HttpTestingController;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [SettingsProfilePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(SettingsProfilePage);
    fixture.detectChanges();
    return {
      page: fixture.componentInstance,
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      detect: () => fixture.detectChanges(),
    };
  }

  it('shows Max 8 MiB leftover mockup copy is not 2MB', async () => {
    const { root, http, detect } = await setup();
    http.expectOne(`${environment.apiBaseUrl}/profiles/me`).flush({
      view: 'full',
      handle: 'alex',
      displayName: 'Alex',
      visibility: 'public',
    });
    detect();
    expect(root.textContent).toContain('8 MiB');
    expect(root.textContent).not.toContain('2MB');
    expect(root.querySelector('[data-testid="upload-avatar"]')).toBeTruthy();
    http.verify();
  });

  it('FS-MED-02 uploads an avatar with metadata then signed PUT', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response(null, { status: 200 }));
    const { page, http, detect } = await setup();
    http.expectOne(`${environment.apiBaseUrl}/profiles/me`).flush({
      view: 'full',
      handle: 'alex',
      displayName: 'Alex',
      visibility: 'public',
    });
    detect();

    const file = new File([new Uint8Array(32)], 'avatar.jpg', { type: 'image/jpeg' });
    page.uploadAvatar(file);

    const post = http.expectOne(`${environment.apiBaseUrl}/media`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ kind: 'avatar', mime: 'image/jpeg', bytes: 32 });
    const mediaId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    post.flush(
      {
        mediaId,
        uploadUrl: 'https://minio.test/put/original',
        expiresAt: '2026-08-30T12:00:00Z',
      },
      { status: 201, statusText: 'Created' },
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchSpy).toHaveBeenCalled();
    const put = fetchSpy.calls.mostRecent().args;
    expect(put[0]).toBe('https://minio.test/put/original');
    expect((put[1] as RequestInit).method).toBe('PUT');

    await new Promise((resolve) => setTimeout(resolve, 0));
    const url = http.expectOne(`${environment.apiBaseUrl}/media/${mediaId}/url`);
    expect(url.request.method).toBe('GET');
    url.flush({ url: 'https://minio.test/get', expiresAt: '2026-08-30T12:00:01Z' });
    await Promise.resolve();
    await Promise.resolve();

    const patch = http.expectOne(`${environment.apiBaseUrl}/profiles/me`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ avatarMediaId: mediaId });
    patch.flush({
      view: 'full',
      handle: 'alex',
      displayName: 'Alex',
      visibility: 'public',
      avatarMediaId: mediaId,
    });
    http.expectOne(`${environment.apiBaseUrl}/media/${mediaId}/url`).flush({
      url: 'https://minio.test/get',
      expiresAt: '2026-08-30T12:00:02Z',
    });
    detect();
    http.verify();
  });

  it('rejects an image over 8 MiB without calling the API', async () => {
    const { page, http, detect } = await setup();
    http.expectOne(`${environment.apiBaseUrl}/profiles/me`).flush({
      view: 'full',
      handle: 'alex',
      visibility: 'public',
    });
    detect();
    page.uploadAvatar(
      new File([new Uint8Array(8 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' }),
    );
    detect();
    expect(page.error()).toContain('8 MiB');
    http.verify();
  });
});
