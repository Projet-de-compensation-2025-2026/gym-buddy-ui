import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from '../../src/app/auth/auth-session.service';

export const adminGuard: CanActivateFn = () => {
  const session = inject(AuthSession);
  const router = inject(Router);
  if (session.isAdmin()) {
    return true;
  }
  if (session.isStaff()) {
    return router.createUrlTree(['/users']);
  }
  if (session.signedIn()) {
    session.clear();
  }
  return router.createUrlTree(['/login']);
};
