import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../environments/environment';
import { App } from './app.component';
import { routes } from './app.routes';
import { AuthSession } from './auth/auth-session.service';

describe('App', () => {
  async function setup(): Promise<{
    root: HTMLElement;
    app: App;
    http: HttpTestingController;
    router: Router;
    session: AuthSession;
  }> {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return {
      root: fixture.nativeElement as HTMLElement,
      app: fixture.componentInstance,
      http: TestBed.inject(HttpTestingController),
      router: TestBed.inject(Router),
      session: TestBed.inject(AuthSession),
    };
  }

  it('renders the Gym Buddy shell', async () => {
    const { root, http } = await setup();
    expect(root.querySelector('.brand')?.textContent).toContain('Gym Buddy');
    http.verify();
  });

  it('FS-ACCT-06 posts logout with credentials and clears the in-memory access token', async () => {
    const { app, http, router, session } = await setup();
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    session.setAccessToken('access.jwt.token');

    app['logout']();

    const req = http.expectOne(`${environment.apiBaseUrl}/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(session.accessToken()).toBeNull();
    expect(session.signedIn()).toBeFalse();
    expect(navigate).toHaveBeenCalledWith('/login');
    http.verify();
  });
});
