import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthSession } from '../../src/app/auth/auth-session.service';
import { staffGuard } from './staff.guard';

function jwt(role: string): string {
  const payload = btoa(JSON.stringify({ sub: 'id', handle: 'staff', role }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `hdr.${payload}.sig`;
}

describe('staffGuard', () => {
  it('FS-ADM-09 sends members to login and does not keep a member session', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'login', children: [] }])],
    });
    const session = TestBed.inject(AuthSession);
    session.setAccessToken(jwt('member'));
    const result = TestBed.runInInjectionContext(() => staffGuard({} as never, {} as never));
    expect(session.signedIn()).toBeFalse();
    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
  });

  it('allows a moderator through', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'login', children: [] }])],
    });
    const session = TestBed.inject(AuthSession);
    session.setAccessToken(jwt('moderator'));
    const result = TestBed.runInInjectionContext(() => staffGuard({} as never, {} as never));
    expect(result).toBeTrue();
  });
});
