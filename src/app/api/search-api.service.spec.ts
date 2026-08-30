import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { SearchApi } from './search-api.service';

describe('SearchApi', () => {
  let api: SearchApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SearchApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('FS-SRCH-01 lists people through the generated client', () => {
    api.people({ q: 'sarah', sports: ['weightlifting'], city: 'Lyon', size: 20 }).subscribe();
    const req = http.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url === `${environment.apiBaseUrl}/search/people` &&
        request.params.get('q') === 'sarah' &&
        request.params.get('city') === 'Lyon',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], page: { next: null, size: 20 } });
  });

  it('FS-SRCH-01 lists events through the generated client', () => {
    api.events({ activity: 'hiit', remaining: true, size: 20 }).subscribe();
    const req = http.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url === `${environment.apiBaseUrl}/search/events` &&
        request.params.get('activity') === 'hiit',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], page: { next: null, size: 20 } });
  });
});
