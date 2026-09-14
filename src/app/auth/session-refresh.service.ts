import { inject, Injectable, InjectionToken } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, shareReplay, tap, throwError } from 'rxjs';
import { AuthApi } from '../api/auth-api.service';
import { AuthSession } from './auth-session.service';
import { readAccessPayload } from './jwt';

export const SIGN_IN_ROUTE = new InjectionToken<string>('sign-in route', {
  factory: () => '/sign-in',
});

@Injectable({ providedIn: 'root' })
export class SessionRefresh {
  private readonly api = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly signInRoute = inject(SIGN_IN_ROUTE);
  private pending?: Observable<string>;

  refresh(expiredToken: string): Observable<string> {
    if (!this.pending) {
      const userId = this.session.userId();
      this.pending = this.api.refresh().pipe(
        map(({ accessToken }) => {
          if (
            this.session.accessToken() !== expiredToken ||
            (userId && readAccessPayload(accessToken)?.sub !== userId)
          ) {
            throw new Error('The signed-in account changed. Please sign in again.');
          }
          return accessToken;
        }),
        tap((token) => this.session.setAccessToken(token)),
        catchError((error: unknown) => {
          this.expire(expiredToken);
          return throwError(() => error);
        }),
        finalize(() => {
          this.pending = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.pending;
  }

  expire(expectedToken: string): void {
    if (this.session.accessToken() !== expectedToken) return;
    this.session.clear();
    this.session.error.set('Your session has expired. Please sign in again.');
    void this.router.navigateByUrl(this.signInRoute);
  }
}
