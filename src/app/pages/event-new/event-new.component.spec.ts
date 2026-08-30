import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EventNewPage } from './event-new.component';

describe('EventNewPage', () => {
  it('FS-EVT-01 posts an instant event', async () => {
    await TestBed.configureTestingModule({
      imports: [EventNewPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(EventNewPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const http = TestBed.inject(HttpTestingController);
    fixture.componentInstance.form.setValue({
      title: 'Morning HIIT Squad',
      activity: 'HIIT',
      place: 'Iron Gym Center',
      startsAt: '2026-09-01T18:00',
      durationMin: 60,
      visibility: 'public',
      capacity: 10,
    });
    fixture.detectChanges();
    (root.querySelector('[data-testid="submit-event"]') as HTMLButtonElement).click();

    const req = http.expectOne(`${environment.apiBaseUrl}/events`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.title).toBe('Morning HIIT Squad');
    expect(req.request.body.visibility).toBe('public');
    expect(req.request.body.recurrence).toBeNull();
    req.flush({
      id: '33333333-3333-4333-8333-333333333333',
      organizer: {
        userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        handle: 'alex',
        displayName: 'Alex',
      },
      title: 'Morning HIIT Squad',
      activity: 'HIIT',
      place: 'Iron Gym Center',
      startsAt: '2026-09-01T16:00:00Z',
      durationMin: 60,
      visibility: 'public',
      capacity: 10,
      remainingSeats: 10,
      kind: 'instant',
      tags: [],
      createdAt: '2026-08-30T12:00:00Z',
      occurrences: [],
      pendingApplicants: [],
    });
    http.verify();
  });
});
