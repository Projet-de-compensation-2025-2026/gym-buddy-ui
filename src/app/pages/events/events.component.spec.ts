import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EventsPage } from './events.component';

describe('EventsPage', () => {
  async function setup(): Promise<{
    root: HTMLElement;
    http: HttpTestingController;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [EventsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(EventsPage);
    fixture.detectChanges();
    return {
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      detect: () => fixture.detectChanges(),
    };
  }

  it('FS-EVT lists upcoming sessions with Instant and Recurring filters', async () => {
    const { root, http, detect } = await setup();
    expect(root.querySelector('[data-testid="events-loading"]')?.textContent).toContain('Loading');
    const req = http.expectOne(`${environment.apiBaseUrl}/events?size=50`);
    req.flush({
      data: [
        sample('instant', 'Morning Sprint Intervals'),
        sample('recurring', 'Heavy Lifts Crew'),
      ],
      page: { next: null, size: 20 },
    });
    detect();
    expect(root.querySelector('[data-testid="events-list"]')?.textContent).toContain(
      'Morning Sprint Intervals',
    );
    expect(root.textContent).toContain('Heavy Lifts Crew');

    (root.querySelector('[data-testid="tab-instant"]') as HTMLButtonElement).click();
    const instant = http.expectOne(`${environment.apiBaseUrl}/events?kind=instant&size=50`);
    instant.flush({
      data: [sample('instant', 'Morning Sprint Intervals')],
      page: { next: null, size: 20 },
    });
    detect();
    expect(root.querySelector('[data-testid="events-list"]')?.textContent).toContain(
      'Morning Sprint Intervals',
    );
    http.verify();
  });

  it('shows an error and retry without the empty state when the list fails', async () => {
    const { root, http, detect } = await setup();
    http
      .expectOne(`${environment.apiBaseUrl}/events?size=50`)
      .flush(
        { error: { code: 'VALIDATION', message: 'boom' } },
        { status: 500, statusText: 'Server Error' },
      );
    detect();
    expect(root.querySelector('[data-testid="events-error"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="events-retry"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="events-empty"]')).toBeNull();
    http.verify();
  });

  it('shows the empty state without an error on a true empty list', async () => {
    const { root, http, detect } = await setup();
    http.expectOne(`${environment.apiBaseUrl}/events?size=50`).flush({
      data: [],
      page: { next: null, size: 50 },
    });
    detect();
    expect(root.querySelector('[data-testid="events-empty"]')?.textContent).toContain(
      'No upcoming sessions',
    );
    expect(root.querySelector('[data-testid="events-error"]')).toBeNull();
    http.verify();
  });
});

function sample(kind: 'instant' | 'recurring', title: string) {
  return {
    id:
      kind === 'instant'
        ? '11111111-1111-4111-8111-111111111111'
        : '22222222-2222-4222-8222-222222222222',
    organizer: {
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      handle: 'demo.alex',
      displayName: 'Alex',
    },
    title,
    activity: 'Weightlifting',
    place: 'Downtown Stadium',
    startsAt: '2026-09-01T06:30:00Z',
    durationMin: 45,
    visibility: 'public',
    capacity: 3,
    remainingSeats: 3,
    kind,
    tags: [],
    createdAt: '2026-08-30T12:00:00Z',
    occurrences: [],
    pendingApplicants: [],
  };
}
