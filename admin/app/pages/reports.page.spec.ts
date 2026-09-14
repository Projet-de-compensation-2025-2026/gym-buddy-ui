import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReportsPage } from './reports.page';

describe('ReportsPage', () => {
  it('filters resolved reports and exposes the reported target without a second close action', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReportsPage);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((req) => req.url.endsWith('/admin/reports'))
      .flush({ data: [], page: { next: null } });
    fixture.componentInstance.status = 'resolved';
    fixture.componentInstance.query = 'synthetic';
    fixture.componentInstance.reload();
    const request = http.expectOne((req) => req.url.endsWith('/admin/reports'));
    expect(request.request.params.get('status')).toBe('resolved');
    expect(request.request.params.get('q')).toBe('synthetic');
    request.flush({
      data: [
        {
          id: 'report',
          reporterId: 'reporter',
          reporterHandle: 'qa',
          targetType: 'post',
          targetId: 'target-id',
          reason: 'synthetic',
          status: 'resolved',
          createdAt: '2026-09-14T19:00:00Z',
        },
      ],
      page: { next: null },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('target-id');
    expect(fixture.nativeElement.textContent).not.toContain('Close report');
    http.verify();
  });
});
