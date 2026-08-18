import { TestBed } from '@angular/core/testing';
import { AuthSession } from './auth-session.service';

describe('AuthSession', () => {
  it('FS-ACCT-04 keeps the access token in memory and never writes localStorage', () => {
    TestBed.configureTestingModule({});
    const session = TestBed.inject(AuthSession);
    localStorage.clear();

    session.setAccessToken('access.jwt.token');

    expect(session.accessToken()).toBe('access.jwt.token');
    expect(localStorage.length).toBe(0);

    session.clear();
    expect(session.accessToken()).toBeNull();
    expect(localStorage.length).toBe(0);
  });
});
