import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../src/environments/environment';
import { AuthSession } from '../../../src/app/auth/auth-session.service';
import { LoginPage, staffLoginEmail } from './login.page';

function jwt(role: string, handle = 'demo.admin'): string {
  const payload = btoa(JSON.stringify({ sub: 'id', handle, role }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `hdr.${payload}.sig`;
}

describe('LoginPage', () => {
  async function setup(): Promise<{
    page: LoginPage;
    root: HTMLElement;
    http: HttpTestingController;
    router: Router;
    session: AuthSession;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginPage);
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

  it('maps documented fixture handles to the login email', () => {
    expect(staffLoginEmail('demo.admin')).toBe('demo.admin@fixtures.gym.test');
    expect(staffLoginEmail('demo.mod')).toBe('demo.mod@fixtures.gym.test');
    expect(staffLoginEmail('demo.admin@fixtures.gym.test')).toBe('demo.admin@fixtures.gym.test');
  });

  it('FS-ACCT-04 has a password visibility toggle that does not store the password', async () => {
    const { root, page, detect } = await setup();
    const input = root.querySelector<HTMLInputElement>('[data-testid="admin-login-password"]')!;
    const toggle = root.querySelector<HTMLButtonElement>(
      '[data-testid="admin-login-password-visibility"]',
    )!;

    page.form.controls.password.setValue('longenough1');
    expect(input.type).toBe('password');
    expect(input.getAttribute('autocomplete')).toBe('current-password');
    expect(toggle.type).toBe('button');

    toggle.click();
    detect();
    expect(input.type).toBe('text');
    expect(input.value).toBe('longenough1');
  });

  it('FS-ADM-08 posts login for a handle without dying on email format', async () => {
    const { root, http, page, router, session, detect } = await setup();
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    const identifier = root.querySelector<HTMLInputElement>(
      '[data-testid="admin-login-identifier"]',
    )!;
    identifier.value = 'demo.admin';
    identifier.dispatchEvent(new Event('input'));
    page.form.controls.password.setValue('longenough1');
    detect();
    page.submit();

    const req = http.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(req.request.body).toEqual({
      email: 'demo.admin@fixtures.gym.test',
      password: 'longenough1',
    });
    req.flush({ accessToken: jwt('admin') });

    expect(session.isStaff()).toBeTrue();
    expect(navigate).toHaveBeenCalledWith('/users');
    http.verify();
  });
});
