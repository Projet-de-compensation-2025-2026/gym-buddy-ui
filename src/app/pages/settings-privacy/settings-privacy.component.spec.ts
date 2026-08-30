import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../../auth/auth-session.service';
import { SettingsPrivacyPage } from './settings-privacy.component';

describe('SettingsPrivacyPage', () => {
  async function setup(): Promise<{
    page: SettingsPrivacyPage;
    root: HTMLElement;
    http: HttpTestingController;
    session: AuthSession;
    router: Router;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [SettingsPrivacyPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    const session = TestBed.inject(AuthSession);
    session.setAccessToken(fakeJwt('alex'));
    const fixture = TestBed.createComponent(SettingsPrivacyPage);
    fixture.detectChanges();
    return {
      page: fixture.componentInstance,
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      session,
      router: TestBed.inject(Router),
      detect: () => fixture.detectChanges(),
    };
  }

  it('loads visibility and can switch to private', async () => {
    const { http, detect, root } = await setup();
    http.expectOne(`${environment.apiBaseUrl}/profiles/me`).flush({
      view: 'full',
      handle: 'alex',
      visibility: 'public',
    });
    detect();

    (root.querySelector('[data-testid="visibility-private"]') as HTMLButtonElement).click();
    const patch = http.expectOne(`${environment.apiBaseUrl}/profiles/me`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ visibility: 'private' });
    patch.flush({ view: 'full', handle: 'alex', visibility: 'private' });
    detect();
    http.verify();
  });

  it('FS-ACCT-05 posts password change and returns to login', async () => {
    const { http, page, session, router, detect } = await setup();
    http.expectOne(`${environment.apiBaseUrl}/profiles/me`).flush({
      view: 'full',
      handle: 'alex',
      visibility: 'public',
    });
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    page.passwordForm.setValue({
      currentPassword: 'correct-horse',
      newPassword: 'new-correct-horse',
      confirmPassword: 'new-correct-horse',
    });
    page.updatePassword();
    const req = http.expectOne(`${environment.apiBaseUrl}/auth/password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      currentPassword: 'correct-horse',
      newPassword: 'new-correct-horse',
    });
    req.flush(null, { status: 204, statusText: 'No Content' });
    detect();
    expect(session.signedIn()).toBeFalse();
    expect(navigate).toHaveBeenCalledWith('/login');
    http.verify();
  });

  it('FS-ACCT-07 posts close account with the current password', async () => {
    const { http, page, session, router, detect } = await setup();
    http.expectOne(`${environment.apiBaseUrl}/profiles/me`).flush({
      view: 'full',
      handle: 'alex',
      visibility: 'public',
    });
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    page.closeForm.setValue({ password: 'correct-horse' });
    page.closeAccount();
    const req = http.expectOne(`${environment.apiBaseUrl}/me/close`);
    expect(req.request.body).toEqual({ password: 'correct-horse' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    detect();
    expect(session.signedIn()).toBeFalse();
    http.verify();
  });
});

function fakeJwt(handle: string): string {
  const payload = btoa(JSON.stringify({ sub: '11111111-1111-1111-1111-111111111111', handle }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `hdr.${payload}.sig`;
}
