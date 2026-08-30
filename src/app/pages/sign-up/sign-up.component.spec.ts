import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AUTH_COPY } from '../../auth/auth-errors';
import { SignUpPage } from './sign-up.component';

describe('SignUpPage', () => {
  async function setup(): Promise<{
    page: SignUpPage;
    root: HTMLElement;
    http: HttpTestingController;
    router: Router;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [SignUpPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(SignUpPage);
    fixture.detectChanges();
    return {
      page: fixture.componentInstance,
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      router: TestBed.inject(Router),
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
    const input = root.querySelector<HTMLInputElement>('[data-testid="sign-up-password"]')!;
    const toggle = root.querySelector<HTMLButtonElement>(
      '[data-testid="sign-up-password-visibility"]',
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

  it('matches mockup 01 field order Display name → Handle → Email → Password', async () => {
    const { root } = await setup();
    const labels = Array.from(root.querySelectorAll('label')).map((el) =>
      el.childNodes[0]?.textContent?.trim(),
    );
    expect(labels.slice(0, 4)).toEqual([
      'Display name',
      'Handle',
      'Email',
      'Password (min 10 characters)',
    ]);
    expect(root.querySelector('[data-testid="sign-up-submit"]')?.textContent).toContain('Register');
    expect(
      root.querySelector('[data-testid="sign-up-submit"]')?.classList.contains('btn-primary'),
    ).toBeTrue();
  });

  it('maps empty submit and short password to the failing fields', async () => {
    const { root, page, detect, http } = await setup();
    page.submit();
    detect();
    expect(page.error()).toBeNull();
    expect(root.querySelector('[data-testid="sign-up-display-name-error"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="sign-up-handle-error"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="sign-up-email-error"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="sign-up-password-error"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="sign-up-error"]')).toBeNull();

    fill(root, {
      'sign-up-email': 'alex@example.com',
      'sign-up-handle': 'alex',
      'sign-up-password': 'short',
      'sign-up-display-name': 'Alex',
    });
    page.submit();
    detect();
    expect(root.querySelector('[data-testid="sign-up-password-error"]')?.textContent).toContain(
      AUTH_COPY.passwordMin,
    );
    http.expectNone(`${environment.apiBaseUrl}/auth/register`);
  });

  it('FS-ACCT-01 posts email, handle, password, and display name to register', async () => {
    const { root, http, router, page } = await setup();
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    fill(root, {
      'sign-up-email': 'alex@example.com',
      'sign-up-handle': 'alex',
      'sign-up-password': 'longenough1',
      'sign-up-display-name': 'Alex',
    });
    page.submit();

    const req = http.expectOne(`${environment.apiBaseUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'alex@example.com',
      handle: 'alex',
      password: 'longenough1',
      displayName: 'Alex',
    });
    req.flush(
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'alex@example.com',
        handle: 'alex',
        displayName: 'Alex',
        role: 'member',
      },
      { status: 201, statusText: 'Created' },
    );

    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { registered: '1', email: 'alex@example.com' },
      state: { registered: true, email: 'alex@example.com' },
    });
    http.verify();
  });

  it('FS-ACCT-03 does not post when the password is shorter than 10 or equals email or handle', async () => {
    const { root, http, page } = await setup();

    fill(root, {
      'sign-up-email': 'alex@example.com',
      'sign-up-handle': 'alex',
      'sign-up-password': 'short',
      'sign-up-display-name': 'Alex',
    });
    page.submit();
    http.expectNone(`${environment.apiBaseUrl}/auth/register`);

    fill(root, {
      'sign-up-password': 'alex@example.com',
    });
    page.submit();
    http.expectNone(`${environment.apiBaseUrl}/auth/register`);

    fill(root, {
      'sign-up-password': 'alex',
    });
    page.submit();
    http.expectNone(`${environment.apiBaseUrl}/auth/register`);
    http.verify();
  });

  it('FS-ACCT-02 shows CONFLICT on the email field when details.path is email', async () => {
    const { root, http, page, detect } = await setup();

    fill(root, {
      'sign-up-email': 'alex@example.com',
      'sign-up-handle': 'alex',
      'sign-up-password': 'longenough1',
      'sign-up-display-name': 'Alex',
    });
    page.submit();

    http.expectOne(`${environment.apiBaseUrl}/auth/register`).flush(
      {
        error: {
          code: 'CONFLICT',
          message: 'email already registered',
          details: [{ path: 'email', issue: 'duplicate' }],
        },
      },
      { status: 409, statusText: 'Conflict' },
    );
    detect();

    expect(page.error()).toBeNull();
    expect(root.querySelector('[data-testid="sign-up-email-error"]')?.textContent).toContain(
      AUTH_COPY.emailTaken,
    );
    expect(root.textContent).not.toContain('email already registered');
    http.verify();
  });
});
