import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthSession } from '../../src/app/auth/auth-session.service';
import { AdminApp } from './app';

function jwt(role: string): string {
  const payload = btoa(JSON.stringify({ sub: 'id', handle: 'staff', role }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `hdr.${payload}.sig`;
}

describe('AdminApp nav', () => {
  async function setup(role: string | null): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [AdminApp],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
    if (role) {
      TestBed.inject(AuthSession).setAccessToken(jwt(role));
    }
    const fixture = TestBed.createComponent(AdminApp);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('FS-ADM-08 keeps signed-out login in a single shell column', async () => {
    const root = await setup(null);
    const shell = root.querySelector('.shell')!;
    expect(shell.classList.contains('shell-nav')).toBeFalse();
    expect(root.querySelector('aside.nav')).toBeNull();
  });

  it('FS-ADM-05 hides Fixtures and Audit from a moderator', async () => {
    const root = await setup('moderator');
    const labels = Array.from(root.querySelectorAll('nav a')).map((el) => el.textContent?.trim());
    expect(labels).toEqual(['Users', 'Content', 'Reports', 'Media']);
  });

  it('FS-ADM-05 shows Fixtures and Audit for an admin', async () => {
    const root = await setup('admin');
    const labels = Array.from(root.querySelectorAll('nav a')).map((el) => el.textContent?.trim());
    expect(labels).toEqual(['Users', 'Content', 'Reports', 'Media', 'Fixtures', 'Audit']);
  });
});
