import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../../auth/auth-session.service';
import { ProfilePage } from './profile.component';

describe('ProfilePage', () => {
  async function setup(handle = 'blake'): Promise<{
    root: HTMLElement;
    http: HttpTestingController;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ handle })) },
        },
      ],
    }).compileComponents();

    TestBed.inject(AuthSession).setAccessToken(fakeJwt('viewer'));
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();
    return {
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      detect: () => fixture.detectChanges(),
    };
  }

  it('shows a loading state then a private stub without bio, sports, or location', async () => {
    const { root, http, detect } = await setup('blake');
    expect(root.querySelector('[data-testid="profile-loading"]')?.textContent).toContain('Loading');

    const req = http.expectOne(`${environment.apiBaseUrl}/profiles/blake`);
    expect(req.request.method).toBe('GET');
    req.flush({
      view: 'stub',
      handle: 'blake',
      visibility: 'private',
      avatarMediaId: null,
    });
    detect();

    expect(root.querySelector('[data-testid="profile-stub"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="profile-bio"]')).toBeNull();
    expect(root.textContent).not.toContain('secret-bio');
    expect(root.textContent).not.toContain('Austin');
    http.verify();
  });

  it('FS-PROF-04 renders a full public profile with bio and friend count', async () => {
    const { root, http, detect } = await setup('blake');
    http.expectOne(`${environment.apiBaseUrl}/profiles/blake`).flush({
      view: 'full',
      handle: 'blake',
      displayName: 'Blake',
      visibility: 'public',
      bio: 'Looking for a spotter',
      sports: ['running'],
      city: 'Austin, TX',
      friendCount: 45,
    });
    detect();

    expect(root.querySelector('[data-testid="profile-full"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="profile-bio"]')?.textContent).toContain(
      'Looking for a spotter',
    );
    expect(root.querySelector('[data-testid="profile-friend-count"]')?.textContent).toContain('45');
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
