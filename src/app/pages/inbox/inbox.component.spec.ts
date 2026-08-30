import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { sampleConversation } from '../../api/messaging-api.service.spec';
import { InboxPage } from './inbox.component';

describe('InboxPage', () => {
  async function setup(): Promise<{
    root: HTMLElement;
    http: HttpTestingController;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [InboxPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(InboxPage);
    fixture.detectChanges();
    return {
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      detect: () => fixture.detectChanges(),
    };
  }

  it('FS-MSG-09 shows loading then inbox threads with unread', async () => {
    const { root, http, detect } = await setup();
    expect(root.querySelector('[data-testid="inbox-loading"]')?.textContent).toContain('Loading');

    const req = http.expectOne(`${environment.apiBaseUrl}/conversations?size=50`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [sampleConversation()], page: { next: null, size: 50 } });
    detect();

    expect(root.querySelector('[data-testid="inbox-list"]')?.textContent).toContain('Blake');
    expect(root.querySelector('[data-testid="inbox-unread"]')?.textContent).toContain('1');
    http.verify();
  });

  it('shows empty and error states', async () => {
    const { root, http, detect } = await setup();
    http.expectOne(`${environment.apiBaseUrl}/conversations?size=50`).flush({
      data: [],
      page: { next: null, size: 50 },
    });
    detect();
    expect(root.querySelector('[data-testid="inbox-empty"]')).toBeTruthy();
    http.verify();
  });
});
