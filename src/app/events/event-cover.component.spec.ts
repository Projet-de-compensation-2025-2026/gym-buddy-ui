import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { MediaApi } from '../api/media-api.service';
import { EventCover } from './event-cover.component';

describe('EventCover', () => {
  function setup() {
    const ready = new Subject<{ url: string; expiresAt: string }>();
    const api = jasmine.createSpyObj<MediaApi>('MediaApi', [
      'create',
      'putBytes',
      'waitReady',
      'url',
    ]);
    api.create.and.returnValue(
      of({
        mediaId: 'new-cover',
        uploadUrl: 'https://storage.test/upload',
        expiresAt: '2026-09-14T20:00:00Z',
      }),
    );
    api.putBytes.and.returnValue(of(undefined));
    api.waitReady.and.returnValue(ready);
    api.url.and.returnValue(
      of({ url: 'https://storage.test/image', expiresAt: '2026-09-14T20:00:00Z' }),
    );
    TestBed.configureTestingModule({
      imports: [EventCover],
      providers: [{ provide: MediaApi, useValue: api }],
    });
    const component = TestBed.createComponent(EventCover).componentInstance;
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', {
      value: [new File(['synthetic'], 'cover.png', { type: 'image/png' })],
    });
    return { component, api, ready, event: { target: input } as unknown as Event };
  }

  it('keeps the parent busy until storage confirms ready, then exposes only the ready ID', () => {
    const { component, api, ready, event } = setup();
    component.choose(event);
    expect(component.uploading()).toBeTrue();
    expect(component.mediaId()).toBeNull();
    expect(api.create).toHaveBeenCalledWith({ kind: 'event', mime: 'image/png', bytes: 9 });
    ready.next({ url: 'https://storage.test/image', expiresAt: '2026-09-14T20:00:00Z' });
    expect(component.uploading()).toBeFalse();
    expect(component.mediaId()).toBe('new-cover');
  });

  it('preserves the previous cover and recovers controls after an upload failure', () => {
    const { component, api, event } = setup();
    component.mediaId.set('previous-cover');
    api.putBytes.and.returnValue(throwError(() => new Error('Upload unavailable')));
    component.choose(event);
    expect(component.mediaId()).toBe('previous-cover');
    expect(component.uploading()).toBeFalse();
    expect(component.error()).toBe('Upload unavailable');
  });
});
