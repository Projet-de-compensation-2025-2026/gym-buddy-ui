import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '../../src/app/auth/auth.interceptor';
import { routes } from './app.routes';
import { provideSessionRestore } from '../../src/app/auth/restore-session';
import { SIGN_IN_ROUTE } from '../../src/app/auth/session-refresh.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: SIGN_IN_ROUTE, useValue: '/login' },
    provideSessionRestore(),
  ],
};
