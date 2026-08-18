import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AuthApi } from './auth-api.service';

describe('AuthApi', () => {
  let api: AuthApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AuthApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('registers through the generated client', () => {
    let created: { handle: string } | undefined;
    api
      .register({
        email: 'alex@example.com',
        handle: 'alex',
        password: 'longenough1',
        displayName: 'Alex',
      })
      .subscribe((user) => {
        created = user;
      });

    const req = http.expectOne(`${environment.apiBaseUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    req.flush(
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'alex@example.com',
        handle: 'alex',
        displayName: 'Alex',
        role: 'member',
      },
      { status: 201, statusText: 'Created' },
    );
    expect(created?.handle).toBe('alex');
  });

  it('logs in, refreshes, and logs out with cookie credentials', () => {
    api.login({ email: 'alex@example.com', password: 'longenough1' }).subscribe();
    const login = http.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(login.request.withCredentials).toBeTrue();
    login.flush({ accessToken: 'access.jwt' });

    api.refresh().subscribe();
    const refresh = http.expectOne(`${environment.apiBaseUrl}/auth/refresh`);
    expect(refresh.request.method).toBe('POST');
    expect(refresh.request.withCredentials).toBeTrue();
    refresh.flush({ accessToken: 'access.jwt.rotated' });

    api.logout().subscribe();
    const logout = http.expectOne(`${environment.apiBaseUrl}/auth/logout`);
    expect(logout.request.withCredentials).toBeTrue();
    logout.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('reads healthz through the generated client', () => {
    let status: string | undefined;
    api.health().subscribe((body) => {
      status = body.status;
    });

    const req = http.expectOne(`${environment.apiBaseUrl}/healthz`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'ok' });
    expect(status).toBe('ok');
  });
});
