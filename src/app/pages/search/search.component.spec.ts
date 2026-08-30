import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SearchPage } from './search.component';
import type {
  GetSearchEvents200DataItem,
  GetSearchPeople200DataItem,
} from '../../api/generated/model';

describe('SearchPage', () => {
  async function setup(): Promise<{
    root: HTMLElement;
    http: HttpTestingController;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [SearchPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();
    return {
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      detect: () => fixture.detectChanges(),
    };
  }

  it('FS-SRCH-01 shows a loading state then people cards', async () => {
    const { root, http, detect } = await setup();
    expect(root.querySelector('[data-testid="search-loading"]')?.textContent).toContain('Loading');

    const req = expectPeople(http);
    expect(req.request.params.get('q')).toBeNull();
    req.flush({ data: [samplePerson()], page: { next: null, size: 20 } });
    detect();

    expect(root.querySelector('[data-testid="people-results"]')?.textContent).toContain('Sarah J.');
    expect(root.querySelector('[data-testid="connect"]')?.textContent).toContain('Connect');
    http.verify();
  });

  it('FS-SRCH-02 sends q when the member types', async () => {
    const { root, http, detect } = await setup();
    expectPeople(http).flush({ data: [samplePerson()], page: { next: null, size: 20 } });
    detect();

    typeQuery(root, 'alex');
    detect();
    const req = expectPeople(http);
    expect(req.request.params.get('q')).toBe('alex');
    req.flush({ data: [], page: { next: null, size: 20 } });
    detect();

    expect(root.querySelector('[data-testid="people-empty"]')?.textContent).toContain('No people');
    http.verify();
  });

  it('FS-SRCH-02 sends q when the member presses Enter', async () => {
    const { root, http, detect } = await setup();
    expectPeople(http).flush({ data: [samplePerson()], page: { next: null, size: 20 } });
    detect();

    const input = root.querySelector('[data-testid="search-q"]') as HTMLInputElement;
    input.value = 'demo.alex';
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    detect();
    const req = expectPeople(http);
    expect(req.request.params.get('q')).toBe('demo.alex');
    req.flush({ data: [], page: { next: null, size: 20 } });
    detect();

    expect(root.querySelector('[data-testid="people-empty"]')?.textContent).toContain('No people');
    http.verify();
  });

  it('FS-SRCH-02 Apply Filters still sends q', async () => {
    const { root, http, detect } = await setup();
    expectPeople(http).flush({ data: [samplePerson()], page: { next: null, size: 20 } });
    detect();

    typeQuery(root, 'alex');
    detect();
    expectPeople(http).flush({ data: [], page: { next: null, size: 20 } });
    detect();

    (root.querySelector('[data-testid="apply-filters"]') as HTMLButtonElement).click();
    detect();
    const req = expectPeople(http);
    expect(req.request.params.get('q')).toBe('alex');
    req.flush({ data: [], page: { next: null, size: 20 } });
    detect();
    expect(root.querySelector('[data-testid="people-empty"]')).toBeTruthy();
    http.verify();
  });

  it('FS-SRCH-01 Events tab stays on search and calls GET /search/events', async () => {
    const { root, http, detect } = await setup();
    expectPeople(http).flush({ data: [], page: { next: null, size: 20 } });
    detect();

    const tab = root.querySelector('[data-testid="tab-events"]') as HTMLButtonElement;
    expect(tab.tagName).toBe('BUTTON');
    expect(tab.getAttribute('href')).toBeNull();
    expect(tab.getAttribute('role')).toBe('tab');
    tab.click();
    detect();
    const events = expectEvents(http);
    expect(events.request.params.get('q')).toBeNull();
    events.flush({ data: [sampleEvent()], page: { next: null, size: 20 } });
    detect();

    expect(root.querySelector('[data-testid="events-results"]')?.textContent).toContain(
      'Weekend HIIT Bootcamp',
    );
    expect(http.match((r) => r.url === `${environment.apiBaseUrl}/events`).length).toBe(0);
    http.verify();
  });

  it('FS-SRCH-01 Events tab sends q to search/events and does not call GET /events', async () => {
    const { root, http, detect } = await setup();
    expectPeople(http).flush({ data: [], page: { next: null, size: 20 } });
    detect();

    typeQuery(root, 'hiit');
    detect();
    expectPeople(http).flush({ data: [], page: { next: null, size: 20 } });
    detect();

    (root.querySelector('[data-testid="tab-events"]') as HTMLButtonElement).click();
    detect();
    const events = expectEvents(http);
    expect(events.request.params.get('q')).toBe('hiit');
    events.flush({ data: [], page: { next: null, size: 20 } });
    detect();

    expect(root.querySelector('[data-testid="events-empty"]')?.textContent).toContain('No events');
    expect(http.match((r) => r.url === `${environment.apiBaseUrl}/events`).length).toBe(0);
    http.verify();
  });

  it('shows empty and error states', async () => {
    const { root, http, detect } = await setup();
    expectPeople(http).flush({ data: [], page: { next: null, size: 20 } });
    detect();
    expect(root.querySelector('[data-testid="people-empty"]')?.textContent).toContain('No people');

    (root.querySelector('[data-testid="apply-filters"]') as HTMLButtonElement).click();
    detect();
    expectPeople(http).flush(
      { error: { code: 'VALIDATION', message: 'radiusKm must be between 1 and 50' } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    detect();
    expect(root.querySelector('[data-testid="search-error"]')?.textContent).toContain('radiusKm');
    http.verify();
  });

  it('CONNECT posts a friendship request', async () => {
    const { root, http, detect } = await setup();
    const person = samplePerson();
    expectPeople(http).flush({ data: [person], page: { next: null, size: 20 } });
    detect();

    (root.querySelector('[data-testid="connect"]') as HTMLButtonElement).click();
    const post = http.expectOne(`${environment.apiBaseUrl}/friendships`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ handle: 'sarahj' });
    post.flush({
      id: '11111111-1111-1111-1111-111111111111',
      status: 'pending',
      peer: {
        userId: '22222222-2222-2222-2222-222222222222',
        handle: 'sarahj',
        displayName: 'Sarah J.',
      },
    });
    expectPeople(http).flush({
      data: [{ ...person, friendState: 'pending' }],
      page: { next: null, size: 20 },
    });
    detect();
    expect(root.textContent).toContain('Pending');
    http.verify();
  });
});

function expectPeople(http: HttpTestingController) {
  return http.expectOne(
    (r) => r.method === 'GET' && r.url.startsWith(`${environment.apiBaseUrl}/search/people`),
  );
}

function expectEvents(http: HttpTestingController) {
  return http.expectOne(
    (r) => r.method === 'GET' && r.url.startsWith(`${environment.apiBaseUrl}/search/events`),
  );
}

function typeQuery(root: HTMLElement, value: string): void {
  const input = root.querySelector('[data-testid="search-q"]') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function samplePerson(): GetSearchPeople200DataItem {
  return {
    handle: 'sarahj',
    displayName: 'Sarah J.',
    visibility: 'public',
    sports: ['weightlifting'],
    experienceLevel: 'intermediate',
    city: 'Lyon',
    distanceKm: 2,
    friendState: 'none',
  };
}

function sampleEvent(): GetSearchEvents200DataItem {
  return {
    id: '33333333-3333-3333-3333-333333333333',
    title: 'Weekend HIIT Bootcamp',
    activity: 'hiit',
    place: 'Central Park',
    startsAt: '2026-10-14T09:00:00Z',
    remainingSeats: 4,
    capacity: 8,
    organizer: {
      userId: '44444444-4444-4444-4444-444444444444',
      handle: 'coach',
      displayName: 'Coach',
    },
  };
}
