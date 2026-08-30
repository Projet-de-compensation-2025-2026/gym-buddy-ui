import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../environments/environment';
import { App } from './app.component';
import { routes } from './app.routes';
import { AuthSession } from './auth/auth-session.service';

describe('App', () => {
  async function setup(): Promise<{
    root: HTMLElement;
    app: App;
    http: HttpTestingController;
    router: Router;
    session: AuthSession;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return {
      root: fixture.nativeElement as HTMLElement,
      app: fixture.componentInstance,
      http: TestBed.inject(HttpTestingController),
      router: TestBed.inject(Router),
      session: TestBed.inject(AuthSession),
      detect: () => fixture.detectChanges(),
    };
  }

  it('renders the Gym Buddy shell', async () => {
    const { root, http } = await setup();
    expect(root.querySelector('.brand')?.textContent).toContain('Gym Buddy');
    http.verify();
  });

  it('links Events, Friends, and Search when signed in', async () => {
    const { root, session, detect, http } = await setup();
    const payload = btoa(
      JSON.stringify({ sub: '11111111-1111-1111-1111-111111111111', handle: 'alex' }),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    session.setAccessToken(`hdr.${payload}.sig`);
    detect();
    const feed = http.match(
      (r) => r.method === 'GET' && r.url.startsWith(`${environment.apiBaseUrl}/feed`),
    );
    for (const req of feed) {
      req.flush({ data: [], page: { next: null, size: 20 } });
    }
    detect();
    const events = Array.from(root.querySelectorAll('a')).find(
      (el) => el.textContent?.trim() === 'Events',
    );
    const friends = Array.from(root.querySelectorAll('a')).find(
      (el) => el.textContent?.trim() === 'Friends',
    );
    const search = Array.from(root.querySelectorAll('a')).find(
      (el) => el.textContent?.trim() === 'Search',
    );
    expect(events).toBeTruthy();
    expect(friends).toBeTruthy();
    expect(search).toBeTruthy();
    expect(
      events?.getAttribute('href') ?? events?.getAttribute('ng-reflect-router-link') ?? '',
    ).toContain('events');
    expect(
      friends?.getAttribute('href') ?? friends?.getAttribute('ng-reflect-router-link') ?? '',
    ).toContain('friends');
    expect(
      search?.getAttribute('href') ?? search?.getAttribute('ng-reflect-router-link') ?? '',
    ).toContain('search');
    http.verify();
  });

  it('FS-ACCT-06 posts logout with credentials and clears the in-memory access token', async () => {
    const { app, http, router, session } = await setup();
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    session.setAccessToken('access.jwt.token');

    app['logout']();

    const req = http.expectOne(`${environment.apiBaseUrl}/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(session.accessToken()).toBeNull();
    expect(session.signedIn()).toBeFalse();
    expect(navigate).toHaveBeenCalledWith('/login');
    http.verify();
  });

  it('renders a not-found page for unknown client routes without rewriting to /', async () => {
    const { root, http, router, detect } = await setup();
    await router.navigateByUrl('/does-not-exist');
    detect();
    expect(router.url).toBe('/does-not-exist');
    expect(root.querySelector('[data-testid="not-found"]')?.textContent).toContain(
      'does not exist',
    );
    http.verify();
  });

  it('sends unauthenticated visitors of /friends/suggestions and /settings to /login', async () => {
    const { http, router, detect } = await setup();
    await router.navigateByUrl('/friends/suggestions');
    detect();
    expect(router.url).toBe('/login');

    await router.navigateByUrl('/settings');
    detect();
    expect(router.url).toBe('/login');
    http.verify();
  });

  it('marks Suggestions as the active nav item on /suggestions', async () => {
    const { root, session, detect, http, router } = await setup();
    const payload = btoa(
      JSON.stringify({ sub: '11111111-1111-1111-1111-111111111111', handle: 'alex' }),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    session.setAccessToken(`hdr.${payload}.sig`);
    detect();
    for (const req of http.match(
      (r) => r.method === 'GET' && r.url.startsWith(`${environment.apiBaseUrl}/feed`),
    )) {
      req.flush({ data: [], page: { next: null, size: 20 } });
    }
    await router.navigateByUrl('/suggestions');
    detect();
    for (const req of http.match(() => true)) {
      if (req.request.url.includes('/suggestions')) {
        req.flush({ data: [], page: { size: 20, next: null } });
      } else if (req.request.url.includes('/matching/me')) {
        req.flush({ optedIn: false, weekStart: '2026-08-24' });
      } else {
        req.flush({ data: [], page: { next: null, size: 20 } });
      }
    }
    detect();
    const friends = Array.from(root.querySelectorAll('a')).find(
      (el) => el.textContent?.trim() === 'Friends',
    );
    const suggestions = root.querySelector('[data-testid="nav-suggestions"]');
    expect(suggestions).toBeTruthy();
    expect(suggestions?.classList.contains('active')).toBeTrue();
    expect(friends?.classList.contains('active')).toBeFalse();
    http.verify();
  });
});
