import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AuthApi } from '../api/auth-api.service';
import { AuthSession } from './auth-session.service';
import { applyRefreshResponse } from './restore-session';

describe('restore-session', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('stores the access JWT when POST /auth/refresh succeeds', () => {
    const api = TestBed.inject(AuthApi);
    const session = TestBed.inject(AuthSession);
    const http = TestBed.inject(HttpTestingController);

    applyRefreshResponse(api, session).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/auth/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ accessToken: 'access.jwt.from.refresh' });

    expect(session.accessToken()).toBe('access.jwt.from.refresh');
    expect(session.signedIn()).toBeTrue();
    expect(session.error()).toBeNull();
    http.verify();
  });

  it('stays logged out on 401 without a session banner', () => {
    const api = TestBed.inject(AuthApi);
    const session = TestBed.inject(AuthSession);
    const http = TestBed.inject(HttpTestingController);

    applyRefreshResponse(api, session).subscribe();
    http
      .expectOne(`${environment.apiBaseUrl}/auth/refresh`)
      .flush(
        { error: { code: 'UNAUTHENTICATED', message: 'refresh credential is missing' } },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(session.accessToken()).toBeNull();
    expect(session.signedIn()).toBeFalse();
    expect(session.error()).toBeNull();
    http.verify();
  });
});
