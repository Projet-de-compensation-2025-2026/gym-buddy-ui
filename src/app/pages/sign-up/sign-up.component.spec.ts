import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SignUpPage } from './sign-up.component';

describe('SignUpPage', () => {
  async function setup(): Promise<{
    page: SignUpPage;
    root: HTMLElement;
    http: HttpTestingController;
    router: Router;
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

  it('FS-ACCT-01 posts email, handle, password, and display name to register', async () => {
    const { root, http, router, page } = await setup();
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);

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

    expect(navigate).toHaveBeenCalledWith('/login', { state: { registered: true } });
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

  it('FS-ACCT-02 shows CONFLICT when email or handle is already taken', async () => {
    const { root, http, page } = await setup();

    fill(root, {
      'sign-up-email': 'alex@example.com',
      'sign-up-handle': 'alex',
      'sign-up-password': 'longenough1',
      'sign-up-display-name': 'Alex',
    });
    page.submit();

    http
      .expectOne(`${environment.apiBaseUrl}/auth/register`)
      .flush(
        { error: { code: 'CONFLICT', message: 'Email or handle already exists' } },
        { status: 409, statusText: 'Conflict' },
      );

    expect(page.error()).toBe('Email or handle already exists');
    http.verify();
  });
});
