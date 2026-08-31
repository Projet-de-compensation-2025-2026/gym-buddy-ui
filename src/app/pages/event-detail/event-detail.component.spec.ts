import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../../auth/auth-session.service';
import { EventDetailPage } from './event-detail.component';

const EVENT_ID = '44444444-4444-4444-8444-444444444444';

describe('EventDetailPage', () => {
  async function setup(): Promise<{
    root: HTMLElement;
    http: HttpTestingController;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [EventDetailPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: EVENT_ID }) } },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(EventDetailPage);
    fixture.detectChanges();
    return {
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      detect: () => fixture.detectChanges(),
    };
  }

  it('FS-EVT-05 applies to join', async () => {
    const { root, http, detect } = await setup();
    http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}`).flush(detail());
    detect();
    expect(root.querySelector('[data-testid="spots-left"]')?.textContent).toContain('3 spots left');
    (root.querySelector('[data-testid="apply"]') as HTMLButtonElement).click();
    const apply = http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}/applications`);
    expect(apply.request.method).toBe('POST');
    apply.flush({
      id: '55555555-5555-4555-8555-555555555555',
      eventId: EVENT_ID,
      occurrenceId: '66666666-6666-4666-8666-666666666666',
      applicant: {
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        handle: 'blake',
        displayName: 'Blake',
      },
      status: 'pending',
      createdAt: '2026-08-30T12:00:00Z',
    });
    http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}`).flush(detail());
    http.verify();
  });

  it('FS-EVT-13 lists pending applicants for the organizer', async () => {
    const { root, http, detect } = await setup();
    signInOrganizer();
    http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}`).flush(detail());
    detect();
    expect(root.querySelector('[data-testid="applicant-queue"]')?.textContent).toContain('Blake');
    http.verify();
  });

  it('FS-EVT-08 shows cancelled instead of Full after series cancel', async () => {
    const { root, http, detect } = await setup();
    http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}`).flush(cancelledDetail());
    detect();
    const spots = root.querySelector('[data-testid="spots-left"]')?.textContent ?? '';
    expect(spots).toContain('Cancelled');
    expect(spots).not.toContain('Full');
    expect(spots).not.toContain('spots left');
    expect(root.querySelector('[data-testid="cancelled-notice"]')?.textContent).toContain(
      'This session was cancelled.',
    );
    expect(root.querySelector('[data-testid="occurrences"]')?.textContent).toContain('Cancelled');
    expect(root.querySelector('[data-testid="apply"]')).toBeNull();
    http.verify();
  });

  it('FS-EVT-08 organizer cancel posts the documented cancel operation', async () => {
    const { root, http, detect } = await setup();
    signInOrganizer();
    http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}`).flush(detail());
    detect();
    expect(root.querySelector('[data-testid="cancel-event"]')?.textContent).toContain(
      'Cancel series',
    );
    (root.querySelector('[data-testid="cancel-event"]') as HTMLButtonElement).click();
    const cancel = http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}/cancel`);
    expect(cancel.request.method).toBe('POST');
    cancel.flush(cancelledDetail());
    http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}`).flush(cancelledDetail());
    detect();
    expect(root.querySelector('[data-testid="spots-left"]')?.textContent).toContain('Cancelled');
    expect(root.querySelector('[data-testid="cancel-event"]')).toBeNull();
    http.verify();
  });

  it('FS-EVT-08 organizer can cancel one occurrence', async () => {
    const { root, http, detect } = await setup();
    signInOrganizer();
    http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}`).flush(detail());
    detect();
    (root.querySelector('[data-testid="cancel-occurrence"]') as HTMLButtonElement).click();
    const cancel = http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}/cancel`);
    expect(cancel.request.method).toBe('POST');
    expect(cancel.request.body).toEqual({ occurrenceId: '66666666-6666-4666-8666-666666666666' });
    cancel.flush(detail({ cancelled: true, remainingSeats: 0 }));
    http
      .expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}`)
      .flush(detail({ cancelled: true, remainingSeats: 0 }));
    detect();
    expect(root.querySelector('[data-testid="occurrences"]')?.textContent).toContain('Cancelled');
    http.verify();
  });
});

function signInOrganizer(): void {
  const session = TestBed.inject(AuthSession);
  const payload = btoa(
    JSON.stringify({ sub: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', handle: 'alex' }),
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  session.setAccessToken(`hdr.${payload}.sig`);
}

function detail(occurrence: { cancelled?: boolean; remainingSeats?: number } = {}) {
  return {
    id: EVENT_ID,
    organizer: {
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      handle: 'alex',
      displayName: 'Alex',
    },
    title: 'Heavy Lifts Crew',
    activity: 'Weightlifting',
    place: 'Iron Works Gym',
    startsAt: '2026-09-01T18:00:00Z',
    durationMin: 90,
    visibility: 'friends',
    capacity: 5,
    remainingSeats: occurrence.cancelled ? 0 : 3,
    kind: 'recurring',
    tags: ['Squats'],
    createdAt: '2026-08-30T12:00:00Z',
    occurrences: [
      {
        id: '66666666-6666-4666-8666-666666666666',
        eventId: EVENT_ID,
        startsAt: '2026-09-01T18:00:00Z',
        remainingSeats: occurrence.remainingSeats ?? 3,
        acceptedCount: occurrence.cancelled ? 0 : 2,
        cancelled: occurrence.cancelled ?? false,
      },
    ],
    pendingApplicants: [
      {
        application: {
          id: '77777777-7777-4777-8777-777777777777',
          eventId: EVENT_ID,
          occurrenceId: '66666666-6666-4666-8666-666666666666',
          applicant: {
            userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            handle: 'blake',
            displayName: 'Blake',
          },
          status: 'pending',
          createdAt: '2026-08-30T12:00:00Z',
        },
        matchingScore: 0.82,
      },
    ],
  };
}

function cancelledDetail() {
  return {
    ...detail({ cancelled: true, remainingSeats: 0 }),
    remainingSeats: 0,
    cancelledAt: '2026-08-31T17:58:12.928Z',
    viewerApplication: {
      id: '55555555-5555-4555-8555-555555555555',
      eventId: EVENT_ID,
      occurrenceId: '66666666-6666-4666-8666-666666666666',
      applicant: {
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        handle: 'blake',
        displayName: 'Blake',
      },
      status: 'cancelled',
      createdAt: '2026-08-30T12:00:00Z',
    },
    pendingApplicants: [],
  };
}
