import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthSession } from './auth-session.service';
import { SessionRefresh } from './session-refresh.service';
import { readAccessPayload } from './jwt';

function unauthenticated(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 401;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const baseURI = inject(DOCUMENT).baseURI;
  const api = new URL(environment.apiBaseUrl, baseURI);
  const url = new URL(req.url, baseURI);
  const path = api.pathname.replace(/\/$/, '');
  const isApi =
    url.origin === api.origin && (url.pathname === path || url.pathname.startsWith(`${path}/`));
  const isAuthExchange = /^\/auth\/(login|register|refresh|logout)$/.test(
    url.pathname.slice(path.length),
  );
  const session = inject(AuthSession);
  const token = session.accessToken();
  if (!isApi || isAuthExchange || !token) {
    return next(req);
  }
  const refresh = inject(SessionRefresh);
  const authorized = (jwt: string) => req.clone({ setHeaders: { Authorization: `Bearer ${jwt}` } });
  return next(authorized(token)).pipe(
    catchError((error: unknown) => {
      if (!unauthenticated(error)) return throwError(() => error);
      const current = session.accessToken();
      if (!current) return throwError(() => error);
      const retry = (jwt: string) =>
        next(authorized(jwt)).pipe(
          catchError((retryError: unknown) => {
            if (unauthenticated(retryError)) refresh.expire(jwt);
            return throwError(() => retryError);
          }),
        );
      // A concurrent request may already have refreshed this token.
      if (current !== token) {
        const originalUser = readAccessPayload(token)?.sub;
        return originalUser && originalUser === readAccessPayload(current)?.sub
          ? retry(current)
          : throwError(() => error);
      }
      return refresh.refresh(token).pipe(switchMap(retry));
    }),
  );
};
