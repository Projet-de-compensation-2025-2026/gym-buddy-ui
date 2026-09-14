import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../../auth/auth-session.service';
import { EventDetailPage } from './event-detail.component';

const EVENT_ID = '44444444-4444-4444-8444-444444444444';

describe('EventDetailPage', () => {
  beforeEach(() => jasmine.clock().install().mockDate(new Date('2026-08-30T12:00:00Z')));
  afterEach(() => jasmine.clock().uninstall());
  async function setup(): Promise<{
    root: HTMLElement;
    http: HttpTestingController;
    detect: () => void;
    component: EventDetailPage;
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
      component: fixture.componentInstance,
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

  it('keeps the editor mounted during cover upload and allows cancel/reopen after completion', async () => {
    const { root, http, detect, component } = await setup();
    signInOrganizer();
    http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}`).flush(detail());
    component.beginEdit();
    component.coverUploading.set(true);
    detect();
    const cancel = Array.from(root.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Cancel editing',
    )!;
    expect(cancel.disabled).toBeTrue();
    cancel.click();
    expect(component.editing()).toBeTrue();
    component.coverUploading.set(false);
    detect();
    cancel.click();
    expect(component.editing()).toBeFalse();
    component.beginEdit();
    detect();
    expect((root.querySelector('app-event-cover input') as HTMLInputElement).disabled).toBeFalse();
    http.verify();
  });

  it('FS-EVT-05 selects a later occurrence before applying', async () => {
    const { root, http, detect } = await setup();
    const second = '88888888-8888-4888-8888-888888888888';
    const event = detail();
    event.occurrences.push({
      ...event.occurrences[0],
      id: second,
      startsAt: '2026-09-08T18:00:00Z',
    });
    http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}`).flush(event);
    detect();
    const select = root.querySelector('[data-testid="occurrence-select"]') as HTMLSelectElement;
    select.value = second;
    select.dispatchEvent(new Event('change'));
    detect();
    expect(root.querySelector('[data-testid="occurrence-select"]')).toBeNull();
    http
      .expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}?occurrenceId=${second}`)
      .flush(event);
    detect();
    const restored = root.querySelector('[data-testid="occurrence-select"]') as HTMLSelectElement;
    expect(restored.value).toBe(second);
    expect(restored.selectedOptions[0].textContent).toContain('Sep 8');
    (root.querySelector('[data-testid="apply"]') as HTMLButtonElement).click();
    const apply = http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}/applications`);
    expect(apply.request.body).toEqual({ occurrenceId: second });
    apply.flush({});
    http
      .expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}?occurrenceId=${second}`)
      .flush(event);
    http.verify();
  });

  it('keeps a cancelled occurrence selected and labels its availability after loading', async () => {
    const { root, http, detect } = await setup();
    const cancelledId = '88888888-8888-4888-8888-888888888888';
    const event = detail();
    event.occurrences.push({
      ...event.occurrences[0],
      id: cancelledId,
      startsAt: '2026-09-08T18:00:00Z',
      cancelled: true,
      remainingSeats: 0,
    });
    http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}`).flush(event);
    detect();
    const views = root.querySelectorAll('[data-testid="occurrences"] button');
    (views[1] as HTMLButtonElement).click();
    detect();
    expect(root.querySelector('[data-testid="occurrence-select"]')).toBeNull();
    http
      .expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}?occurrenceId=${cancelledId}`)
      .flush({ ...event, remainingSeats: 0 });
    detect();
    const select = root.querySelector('[data-testid="occurrence-select"]') as HTMLSelectElement;
    expect(select.value).toBe(cancelledId);
    expect(select.selectedOptions[0].textContent).toContain('Cancelled');
    const spots = root.querySelector('[data-testid="spots-left"]')?.textContent ?? '';
    expect(spots).toContain('Cancelled');
    expect(spots).not.toContain('Full');
    expect(root.querySelector('[data-testid="apply"]')).toBeNull();
    expect(root.querySelector('[data-testid="occurrences"]')?.textContent).toContain(
      '3 spots left',
    );
    http.verify();
  });

  it('FS-EVT-09 lets the organizer save a changed place', async () => {
    const { root, http, detect } = await setup();
    signInOrganizer();
    http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}`).flush(detail());
    detect();
    Array.from(root.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Edit event')!
      .click();
    detect();
    const input = root.querySelector('input[formControlName="place"]') as HTMLInputElement;
    input.value = 'New training hall';
    input.dispatchEvent(new Event('input'));
    Array.from(root.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Save event')!
      .click();
    const patch = http.expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body.place).toBe('New training hall');
    patch.flush({ ...detail(), place: 'New training hall' });
    http
      .expectOne(`${environment.apiBaseUrl}/events/${EVENT_ID}`)
      .flush({ ...detail(), place: 'New training hall' });
    detect();
    expect(root.textContent).toContain('New training hall');
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
