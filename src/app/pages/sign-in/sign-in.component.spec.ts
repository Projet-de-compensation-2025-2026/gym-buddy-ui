import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AUTH_COPY } from '../../auth/auth-errors';
import { AuthSession } from '../../auth/auth-session.service';
import { SignInPage } from './sign-in.component';

describe('SignInPage', () => {
  async function setup(query: Record<string, string> = {}): Promise<{
    page: SignInPage;
    root: HTMLElement;
    http: HttpTestingController;
    router: Router;
    session: AuthSession;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [SignInPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(query) },
            queryParamMap: of(convertToParamMap(query)),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SignInPage);
    fixture.detectChanges();
    return {
      page: fixture.componentInstance,
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      router: TestBed.inject(Router),
      session: TestBed.inject(AuthSession),
      detect: () => fixture.detectChanges(),
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

  it('password field has a visibility toggle that shows and hides the typed password', async () => {
    const { root, page, detect } = await setup();
    const input = root.querySelector<HTMLInputElement>('[data-testid="sign-in-password"]')!;
    const toggle = root.querySelector<HTMLButtonElement>(
      '[data-testid="sign-in-password-visibility"]',
    )!;

    page.form.controls.password.setValue('longenough1');
    expect(input.type).toBe('password');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    toggle.click();
    detect();
    expect(input.type).toBe('text');
    expect(input.value).toBe('longenough1');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('matches mockup 02: centered card, teal Log In, no Remember me / Forgot password', async () => {
    const { root } = await setup();
    expect(root.querySelector('.auth-card')).toBeTruthy();
    expect(root.querySelector('[data-testid="sign-in-submit"]')?.textContent).toContain('Log In');
    expect(
      root.querySelector('[data-testid="sign-in-submit"]')?.classList.contains('btn-primary'),
    ).toBeTrue();
    expect(root.textContent).not.toContain('Remember me');
    expect(root.textContent).not.toContain('Forgot password');
  });

  it('maps empty submit to field errors instead of a shared banner', async () => {
    const { root, page, detect } = await setup();
    page.submit();
    detect();
    expect(page.error()).toBeNull();
    expect(root.querySelector('[data-testid="sign-in-email-error"]')?.textContent).toContain(
      AUTH_COPY.emailRequired,
    );
    expect(root.querySelector('[data-testid="sign-in-password-error"]')?.textContent).toContain(
      AUTH_COPY.passwordRequired,
    );
    expect(root.querySelector('[data-testid="sign-in-error"]')).toBeNull();
  });

  it('FS-ACCT-01 shows account-created copy and prefills email after register', async () => {
    const { root, page } = await setup({ registered: '1', email: 'alex@example.com' });
    expect(page.registered()).toBeTrue();
    expect(page.form.controls.email.value).toBe('alex@example.com');
    expect(root.querySelector('[data-testid="sign-in-registered"]')?.textContent).toContain(
      'Account created',
    );
    expect((root.querySelector('[data-testid="sign-in-email"]') as HTMLInputElement).value).toBe(
      'alex@example.com',
    );
  });

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
    req.flush({ accessToken: 'access.jwt.token' });

    expect(session.accessToken()).toBe('access.jwt.token');
    expect(session.signedIn()).toBeTrue();
    expect(localStorage.length).toBe(0);
    expect(navigate).toHaveBeenCalledWith('/');
    http.verify();
  });

  it('FS-ACCT-04 surfaces FORBIDDEN 403 for invalid credentials (generic message)', async () => {
    const { root, http, page, session, detect } = await setup();

    fill(root, {
      'sign-in-email': 'alex@example.com',
      'sign-in-password': 'wrong-password',
    });
    page.submit();

    http
      .expectOne(`${environment.apiBaseUrl}/auth/login`)
      .flush(
        { error: { code: 'FORBIDDEN', message: 'invalid credentials' } },
        { status: 403, statusText: 'Forbidden' },
      );
    detect();

    expect(page.error()).toBe(AUTH_COPY.invalidCredentials);
    expect(root.querySelector('[data-testid="sign-in-error"]')?.textContent).not.toContain(
      'invalid credentials',
    );
    expect(session.accessToken()).toBeNull();
    http.verify();
  });

  it('FS-ACCT-04 surfaces FORBIDDEN 403 when the account is locked', async () => {
    const { root, http, page, session } = await setup();

    fill(root, {
      'sign-in-email': 'alex@example.com',
      'sign-in-password': 'longenough1',
    });
    page.submit();

    http
      .expectOne(`${environment.apiBaseUrl}/auth/login`)
      .flush(
        { error: { code: 'FORBIDDEN', message: 'account is locked' } },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(page.error()).toBe(AUTH_COPY.invalidCredentials);
    expect(page.error()).not.toBe('account is locked');
    expect(session.accessToken()).toBeNull();
    http.verify();
  });
});
