import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { sampleSuggestion } from '../../api/suggestions-api.service.spec';
import { SuggestionsPage } from './suggestions.component';

describe('SuggestionsPage', () => {
  async function setup(): Promise<{
    root: HTMLElement;
    http: HttpTestingController;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [SuggestionsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(SuggestionsPage);
    fixture.detectChanges();
    return {
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      detect: () => fixture.detectChanges(),
    };
  }

  function flushPage(
    http: HttpTestingController,
    suggestions: ReturnType<typeof sampleSuggestion>[] = [sampleSuggestion()],
    matching: {
      optedIn: boolean;
      weekStart: string;
      pair?: { userId: string; handle: string; displayName: string };
    } = {
      optedIn: false,
      weekStart: '2026-08-24',
    },
  ): void {
    const pending = http.match(() => true);
    expect(pending.length).toBe(2);
    for (const req of pending) {
      if (req.request.url.endsWith('/suggestions')) {
        req.flush({ data: suggestions, page: { size: 20, next: null } });
      } else if (req.request.url.endsWith('/matching/me')) {
        req.flush(matching);
      } else {
        fail(`unexpected ${req.request.method} ${req.request.url}`);
      }
    }
  }

  it('FS-SUGG-01 and FS-SUGG-03 show reason, sports chips, Add Friend and Dismiss', async () => {
    const { root, http, detect } = await setup();
    expect(root.querySelector('[data-testid="suggestions-loading"]')?.textContent).toContain(
      'Loading',
    );
    flushPage(http);
    detect();

    const card = root.querySelector('[data-testid="suggestion-card"]');
    expect(card?.textContent).toContain('Sarah Chen');
    expect(card?.textContent).toContain('same gym times');
    expect(card?.textContent).toContain('HIIT');
    expect(card?.textContent).toContain('Running');
    expect(root.querySelector('[data-testid="add-friend"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="dismiss-suggestion"]')).toBeTruthy();
    http.verify();
  });

  it('FS-SUGG-05 add friend posts a normal request and removes the card', async () => {
    const { root, http, detect } = await setup();
    const sample = sampleSuggestion();
    flushPage(http, [sample]);
    detect();

    (root.querySelector('[data-testid="add-friend"]') as HTMLButtonElement).click();
    const req = http.expectOne(`${environment.apiBaseUrl}/friendships`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userId: sample.userId });
    req.flush({
      id: 'friend-1',
      requesterId: '11111111-1111-1111-1111-111111111111',
      addresseeId: sample.userId,
      status: 'pending',
      createdAt: '2026-08-30T12:00:00Z',
      direction: 'outgoing',
      peer: { userId: sample.userId, handle: sample.handle, displayName: sample.displayName },
    });
    detect();
    expect(root.querySelector('[data-testid="suggestions-list"]')?.textContent).not.toContain(
      'Sarah Chen',
    );
    http.verify();
  });

  it('FS-SUGG-04 dismiss posts and removes the card', async () => {
    const { root, http, detect } = await setup();
    const sample = sampleSuggestion();
    flushPage(http, [sample]);
    detect();

    (root.querySelector('[data-testid="dismiss-suggestion"]') as HTMLButtonElement).click();
    const req = http.expectOne(`${environment.apiBaseUrl}/suggestions/${sample.userId}/dismiss`);
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });
    detect();
    expect(root.querySelector('[data-testid="suggestions-empty"]')).toBeTruthy();
    http.verify();
  });

  it('FS-MATCH-01 toggles weekly opt-in on this page', async () => {
    const { root, http, detect } = await setup();
    flushPage(http);
    detect();

    const box = root.querySelector('[data-testid="matching-opt-in"] input') as HTMLInputElement;
    expect(box.checked).toBeFalse();
    box.click();
    const optIn = http.expectOne(`${environment.apiBaseUrl}/matching/opt-in`);
    expect(optIn.request.method).toBe('POST');
    optIn.flush(null, { status: 204, statusText: 'No Content' });
    const me = http.expectOne(`${environment.apiBaseUrl}/matching/me`);
    me.flush({ optedIn: true, weekStart: '2026-08-24' });
    detect();
    expect(
      (root.querySelector('[data-testid="matching-opt-in"] input') as HTMLInputElement).checked,
    ).toBeTrue();
    http.verify();
  });

  it('shows an empty state when there are no suggestions', async () => {
    const { root, http, detect } = await setup();
    flushPage(http, []);
    detect();
    expect(root.querySelector('[data-testid="suggestions-empty"]')).toBeTruthy();
    http.verify();
  });
});
