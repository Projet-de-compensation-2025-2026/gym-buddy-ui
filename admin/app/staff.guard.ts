import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from '../../src/app/auth/auth-session.service';

export const staffGuard: CanActivateFn = () => {
  const session = inject(AuthSession);
  const router = inject(Router);
  if (session.isStaff()) {
    return true;
  }
  if (session.signedIn()) {
    session.clear();
  }
  return router.createUrlTree(['/login']);
};
