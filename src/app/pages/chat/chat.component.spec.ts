import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../../auth/auth-session.service';
import { sampleConversation, sampleMessage } from '../../api/messaging-api.service.spec';
import { ChatPage } from './chat.component';

describe('ChatPage', () => {
  async function setup(): Promise<{
    root: HTMLElement;
    http: HttpTestingController;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [ChatPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: sampleConversation().id })) },
        },
      ],
    }).compileComponents();
    const payload = btoa(
      JSON.stringify({ sub: '11111111-1111-1111-1111-111111111111', handle: 'alex' }),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    TestBed.inject(AuthSession).setAccessToken(`hdr.${payload}.sig`);
    const fixture = TestBed.createComponent(ChatPage);
    fixture.detectChanges();
    return {
      root: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
      detect: () => fixture.detectChanges(),
    };
  }

  it('FS-MSG-03 loads the thread then posts text', async () => {
    const { root, http, detect } = await setup();
    expect(root.querySelector('[data-testid="chat-loading"]')?.textContent).toContain('Loading');

    const list = http.expectOne(
      `${environment.apiBaseUrl}/conversations/${sampleConversation().id}/messages?size=50`,
    );
    expect(list.request.method).toBe('GET');
    list.flush({ data: [sampleMessage()], page: { next: null, size: 50 } });
    detect();
    expect(root.querySelector('[data-testid="chat-messages"]')?.textContent).toContain('Ready?');

    const draft = root.querySelector('[data-testid="chat-draft"]') as HTMLInputElement;
    draft.value = 'On my way';
    draft.dispatchEvent(new Event('input'));
    detect();
    (root.querySelector('[data-testid="chat-send"]') as HTMLButtonElement).click();
    const post = http.expectOne(
      `${environment.apiBaseUrl}/conversations/${sampleConversation().id}/messages`,
    );
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ type: 'text', body: 'On my way' });
    post.flush({ ...sampleMessage(), body: 'On my way' }, { status: 201, statusText: 'Created' });
    http
      .expectOne(
        `${environment.apiBaseUrl}/conversations/${sampleConversation().id}/messages?size=50`,
      )
      .flush({
        data: [{ ...sampleMessage(), body: 'On my way' }, sampleMessage()],
        page: { next: null, size: 50 },
      });
    detect();
    expect(root.textContent).toContain('On my way');
    http.verify();
  });
});
