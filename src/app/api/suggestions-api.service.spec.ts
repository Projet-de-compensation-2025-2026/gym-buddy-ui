import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { SuggestionsApi } from './suggestions-api.service';

describe('SuggestionsApi', () => {
  let api: SuggestionsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SuggestionsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists suggestions through the generated client', () => {
    let size = 0;
    api.list({ size: 20 }).subscribe((page) => {
      size = page.data.length;
    });
    const req = http.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url === `${environment.apiBaseUrl}/suggestions` &&
        request.params.get('size') === '20',
    );
    req.flush({
      data: [sampleSuggestion()],
      page: { size: 20, next: null },
    });
    expect(size).toBe(1);
  });

  it('dismisses and toggles weekly opt-in through the generated client', () => {
    api.dismiss('22222222-2222-2222-2222-222222222222').subscribe();
    const dismiss = http.expectOne(
      `${environment.apiBaseUrl}/suggestions/22222222-2222-2222-2222-222222222222/dismiss`,
    );
    expect(dismiss.request.method).toBe('POST');
    dismiss.flush(null, { status: 204, statusText: 'No Content' });

    api.optIn().subscribe();
    const optIn = http.expectOne(`${environment.apiBaseUrl}/matching/opt-in`);
    expect(optIn.request.method).toBe('POST');
    optIn.flush(null, { status: 204, statusText: 'No Content' });

    api.optOut().subscribe();
    const optOut = http.expectOne(`${environment.apiBaseUrl}/matching/opt-in`);
    expect(optOut.request.method).toBe('DELETE');
    optOut.flush(null, { status: 204, statusText: 'No Content' });

    api.matchingMe().subscribe();
    const me = http.expectOne(`${environment.apiBaseUrl}/matching/me`);
    expect(me.request.method).toBe('GET');
    me.flush({ optedIn: true, weekStart: '2026-08-24' });
  });
});

export function sampleSuggestion() {
  return {
    userId: '22222222-2222-2222-2222-222222222222',
    handle: 'sarah_runs',
    displayName: 'Sarah Chen',
    view: 'full' as const,
    sports: ['HIIT', 'Running'],
    city: 'Porto',
    mutualFriends: 0,
    reason: 'same gym times',
  };
}
