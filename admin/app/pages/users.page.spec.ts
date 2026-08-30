import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../src/environments/environment';
import { UsersPage } from './users.page';

describe('UsersPage', () => {
  it('FS-ADM-04 collects a lock reason instead of hardcoding one', async () => {
    await TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(UsersPage);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((req) => req.url.startsWith(`${environment.apiBaseUrl}/admin/users`))
      .flush({
        data: [],
        page: { size: 50, next: null },
      });
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const row = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'member@gym.test',
      handle: 'member',
      displayName: 'Member',
      role: 'member' as const,
      status: 'active' as const,
      createdAt: '2026-08-30T16:00:00Z',
      lastAdmin: false,
    };
    page.lock(row);
    expect(page.error()).toBe('A lock reason is required.');
    page.lockReason = 'harassment';
    page.lock(row);
    const req = http.expectOne(`${environment.apiBaseUrl}/admin/users/${row.id}/lock`);
    expect(req.request.body).toEqual({ reason: 'harassment' });
    req.flush(row);
    http
      .expectOne((call) => call.url.startsWith(`${environment.apiBaseUrl}/admin/users`))
      .flush({
        data: [],
        page: { size: 50, next: null },
      });
    http.verify();
  });
});
