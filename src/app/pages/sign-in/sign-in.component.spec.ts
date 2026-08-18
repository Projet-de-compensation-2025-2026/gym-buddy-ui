import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../../auth/auth-session.service';
import { SignInPage } from './sign-in.component';

describe('SignInPage', () => {
  async function setup(): Promise<{
    page: SignInPage;
    root: HTMLElement;
    http: HttpTestingController;
    router: Router;
    session: AuthSession;
  }> {
    await TestBed.configureTestingModule({
      imports: [SignInPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(SignInPage);
    fixture.detectChanges();
    return {
      page: fixture.componentInstance,
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      router: TestBed.inject(Router),
      session: TestBed.inject(AuthSession),
    };
  }

  function fill(root: HTMLElement, fields: Record<string, string>): void {
    for (const [testId, value] of Object.entries(fields)) {
      const input = root.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`);
      expect(input).withContext(testId).toBeTruthy();
      input!.value = value;
      input!.dispatchEvent(new Event('input'));
    }
  }

  it('FS-ACCT-04 posts login, stores the access JWT in memory, and does not write localStorage', async () => {
    const { root, http, page, router, session } = await setup();
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    localStorage.clear();

    fill(root, {
      'sign-in-email': 'alex@example.com',
      'sign-in-password': 'longenough1',
    });
    page.submit();

    const req = http.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.body).toEqual({
      email: 'alex@example.com',
      password: 'longenough1',
    });
    req.flush({ accessToken: 'access.jwt.token', expiresIn: 900 });

    expect(session.accessToken()).toBe('access.jwt.token');
    expect(session.signedIn()).toBeTrue();
    expect(localStorage.length).toBe(0);
    expect(navigate).toHaveBeenCalledWith('/');
    http.verify();
  });
});
