import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthSession } from './auth-session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthSession).accessToken();
  if (!token) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
