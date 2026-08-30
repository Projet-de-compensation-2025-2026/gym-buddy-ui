import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthSession } from '../../src/app/auth/auth-session.service';
import { adminGuard } from './admin.guard';

function jwt(role: string): string {
  const payload = btoa(JSON.stringify({ sub: 'id', handle: 'staff', role }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `hdr.${payload}.sig`;
}

describe('adminGuard', () => {
  it('FS-ADM-05 sends a moderator away from fixtures and audit without keeping admin actions', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'users', children: [] },
          { path: 'login', children: [] },
        ]),
      ],
    });
    const session = TestBed.inject(AuthSession);
    session.setAccessToken(jwt('moderator'));
    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    expect(session.signedIn()).toBeTrue();
    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/users']));
  });

  it('allows an admin through', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'login', children: [] }])],
    });
    const session = TestBed.inject(AuthSession);
    session.setAccessToken(jwt('admin'));
    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    expect(result).toBeTrue();
  });
});
