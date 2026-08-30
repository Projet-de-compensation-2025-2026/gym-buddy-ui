import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { EventsApi } from './events-api.service';

describe('EventsApi', () => {
  it('lists events with kind filter', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(EventsApi);
    const http = TestBed.inject(HttpTestingController);
    api.list({ kind: 'instant', size: 20 }).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/events?kind=instant&size=20`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], page: { next: null, size: 20 } });
    http.verify();
  });
});
