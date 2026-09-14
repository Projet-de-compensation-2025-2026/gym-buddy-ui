import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReportButton } from './report-button.component';
import { environment } from '../../environments/environment';

describe('ReportButton', () => {
  it('submits the selected target once and retains the reason on failure', () => {
    TestBed.configureTestingModule({
      imports: [ReportButton],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(ReportButton);
    fixture.componentRef.setInput('targetType', 'post');
    fixture.componentRef.setInput('targetId', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    component.reason.set('Synthetic report for verification');
    component.submit();
    const first = http.expectOne(`${environment.apiBaseUrl}/reports`);
    expect(first.request.body).toEqual({
      targetType: 'post',
      targetId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'Synthetic report for verification',
    });
    first.flush({ error: { message: 'Please retry' } }, { status: 500, statusText: 'Error' });
    expect(component.reason()).toBe('Synthetic report for verification');
    expect(component.busy()).toBeFalse();
    component.submit();
    http.expectOne(`${environment.apiBaseUrl}/reports`).flush({ id: 'report-id' });
    expect(component.sent()).toBeTrue();
    http.verify();
  });
});
