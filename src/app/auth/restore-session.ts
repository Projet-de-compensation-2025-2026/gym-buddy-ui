import { inject, provideAppInitializer } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { AuthApi } from '../api/auth-api.service';
import { AuthSession } from './auth-session.service';

/**
 * POST /auth/refresh with credentials on boot so a refresh cookie (#89) can
 * restore the in-memory access JWT. 401 stays logged out; never set session.error
 * (no raw "refresh credential is missing" banner).
 */
export function applyRefreshResponse(api: AuthApi, session: AuthSession) {
  return api.refresh().pipe(
    tap((tokens) => session.setAccessToken(tokens.accessToken)),
    catchError(() => of(undefined)),
  );
}

export function restoreSession() {
  return applyRefreshResponse(inject(AuthApi), inject(AuthSession));
}

export function provideSessionRestore() {
  return provideAppInitializer(restoreSession);
}
