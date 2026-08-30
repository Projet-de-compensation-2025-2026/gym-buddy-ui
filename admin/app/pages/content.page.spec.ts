import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../src/environments/environment';
import { ContentPage } from './content.page';

describe('ContentPage', () => {
  async function setup(): Promise<{
    page: ContentPage;
    http: HttpTestingController;
  }> {
    await TestBed.configureTestingModule({
      imports: [ContentPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ContentPage);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((req) => req.url.startsWith(`${environment.apiBaseUrl}/admin/content`))
      .flush({
        data: [],
        page: { size: 50, next: null },
      });
    fixture.detectChanges();
    return { page: fixture.componentInstance, http };
  }

  it('FS-ADM-03 lists hideable content instead of requiring a pasted UUID', async () => {
    const { page, http } = await setup();
    expect(page.rows()).toEqual([]);
    page.selectType('comment');
    const req = http.expectOne(
      (call) =>
        call.url.startsWith(`${environment.apiBaseUrl}/admin/content`) &&
        call.params.get('type') === 'comment',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], page: { size: 50, next: null } });
    http.verify();
  });

  it('FS-ADM-03 requires a hide reason and can unhide', async () => {
    const { page, http } = await setup();
    const row = {
      type: 'post' as const,
      id: '11111111-1111-4111-8111-111111111111',
      authorHandle: 'owner',
      summary: 'spam',
      createdAt: '2026-08-30T16:00:00Z',
      hidden: false,
    };
    page.hide(row);
    expect(page.error()).toBe('A hide reason is required.');
    http.verify();

    page.reason = 'spam / solicitation';
    page.hide(row);
    http.expectOne(`${environment.apiBaseUrl}/admin/content/post/${row.id}/hide`).flush(null);
    http
      .expectOne((req) => req.url.startsWith(`${environment.apiBaseUrl}/admin/content`))
      .flush({
        data: [{ ...row, hidden: true, hiddenReason: 'spam / solicitation' }],
        page: { size: 50, next: null },
      });
    expect(page.notice()).toBe('Content hidden.');

    page.unhide({ ...row, hidden: true });
    http.expectOne(`${environment.apiBaseUrl}/admin/content/post/${row.id}/unhide`).flush(null);
    http
      .expectOne((req) => req.url.startsWith(`${environment.apiBaseUrl}/admin/content`))
      .flush({
        data: [],
        page: { size: 50, next: null },
      });
    expect(page.notice()).toBe('Content restored.');
    http.verify();
  });
});
