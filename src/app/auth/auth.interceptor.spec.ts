import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthSession } from './auth-session.service';
import { authInterceptor } from './auth.interceptor';
import { routes } from '../app.routes';

describe('authenticated API refresh', () => {
  const api = environment.apiBaseUrl;
  const jwt = (sub: string, version: string) =>
    `header.${btoa(JSON.stringify({ sub, handle: 'qa', role: 'member', version }))}.signature`;
  const oldToken = jwt('qa', 'old');
  const newToken = jwt('qa', 'new');
  let http: HttpTestingController;
  let client: HttpClient;
  let session: AuthSession;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    session = TestBed.inject(AuthSession);
    session.setAccessToken(oldToken);
  });
  afterEach(() => http.verify());

  it('shares one cookie refresh for concurrent unauthorized requests and retries with the new JWT', () => {
    client.get(`${api}/me`).subscribe();
    client.get(`${api}/posts`).subscribe();
    const first = http.expectOne(`${api}/me`);
    const second = http.expectOne(`${api}/posts`);
    expect(first.request.headers.get('Authorization')).toBe(`Bearer ${oldToken}`);
    first.flush({}, { status: 401, statusText: 'Unauthorized' });
    second.flush({}, { status: 401, statusText: 'Unauthorized' });
    const refresh = http.expectOne(`${api}/auth/refresh`);
    expect(refresh.request.withCredentials).toBeTrue();
    expect(refresh.request.headers.has('Authorization')).toBeFalse();
    refresh.flush({ accessToken: newToken });
    for (const path of ['/me', '/posts']) {
      const retry = http.expectOne(`${api}${path}`);
      expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      retry.flush({});
    }
    expect(session.accessToken()).toBe(newToken);
  });

  it('reuses the refreshed token when an older in-flight request fails later', () => {
    client.get(`${api}/me`).subscribe();
    client.get(`${api}/posts`).subscribe();
    const first = http.expectOne(`${api}/me`);
    const late = http.expectOne(`${api}/posts`);
    first.flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${api}/auth/refresh`).flush({ accessToken: newToken });
    http.expectOne(`${api}/me`).flush({});
    late.flush({}, { status: 401, statusText: 'Unauthorized' });
    const retry = http.expectOne(`${api}/posts`);
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
    retry.flush({});
    http.expectNone(`${api}/auth/refresh`);
  });

  it('does not leak bearer credentials to signed storage URLs or auth exchanges', () => {
    for (const url of [
      'https://storage.example.invalid/object?signature=test',
      `${api}-foreign/object`,
      `${api}/auth/login`,
      `${api}/auth/register`,
      `${api}/auth/refresh`,
      `${api}/auth/logout`,
    ]) {
      client.get(url).subscribe({ error: () => undefined });
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBeFalse();
      request.flush({}, { status: 401, statusText: 'Unauthorized' });
    }
    http.expectNone(`${api}/auth/refresh`);
  });

  it('clears the expired session and returns to sign-in when refresh fails', () => {
    client.get(`${api}/me`).subscribe({ error: () => undefined });
    http.expectOne(`${api}/me`).flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${api}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.signedIn()).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/login');
    expect(
      routes.some((route) => `/${route.path}` === router.navigateByUrl.calls.mostRecent().args[0]),
    ).toBeTrue();
    http.expectNone(`${api}/me`);
  });

  it('never loops if the retried API request is also unauthorized', () => {
    client.get(`${api}/me`).subscribe({ error: () => undefined });
    http.expectOne(`${api}/me`).flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${api}/auth/refresh`).flush({ accessToken: newToken });
    http.expectOne(`${api}/me`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.signedIn()).toBeFalse();
    http.expectNone(`${api}/auth/refresh`);
  });

  it('does not retry a mutation as another account after a shared cookie changes', () => {
    client.post(`${api}/posts`, { body: 'synthetic' }).subscribe({ error: () => undefined });
    http.expectOne(`${api}/posts`).flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${api}/auth/refresh`).flush({ accessToken: jwt('other-account', 'new') });
    expect(session.signedIn()).toBeFalse();
    http.expectNone(`${api}/posts`);
  });

  it('does not refresh forbidden or failed requests', () => {
    for (const status of [403, 404, 500]) {
      client.get(`${api}/me`).subscribe({ error: () => undefined });
      http.expectOne(`${api}/me`).flush({}, { status, statusText: 'Failure' });
    }
    http.expectNone(`${api}/auth/refresh`);
  });

  it('does not replay an old action using a newer explicit login to another account', () => {
    client
      .post(`${api}/posts`, { body: 'old account draft' })
      .subscribe({ error: () => undefined });
    const request = http.expectOne(`${api}/posts`);
    const other = jwt('other-account', 'new');
    session.setAccessToken(other);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.accessToken()).toBe(other);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    http.expectNone(`${api}/posts`);
    http.expectNone(`${api}/auth/refresh`);
  });

  it('does not clear a newer explicit login when an earlier refresh completes or fails', () => {
    for (const refreshFails of [false, true]) {
      session.setAccessToken(oldToken);
      client.get(`${api}/me`).subscribe({ error: () => undefined });
      http.expectOne(`${api}/me`).flush({}, { status: 401, statusText: 'Unauthorized' });
      const refresh = http.expectOne(`${api}/auth/refresh`);
      const other = jwt('other-account', 'new');
      session.setAccessToken(other);
      if (refreshFails) refresh.flush({}, { status: 401, statusText: 'Unauthorized' });
      else refresh.flush({ accessToken: newToken });
      expect(session.accessToken()).toBe(other);
      http.expectNone(`${api}/me`);
    }
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
