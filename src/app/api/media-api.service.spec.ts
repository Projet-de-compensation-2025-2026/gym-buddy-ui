import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { MAX_MEDIA_BYTES, MediaApi, imageMime, rejectIfTooLarge } from './media-api.service';

describe('MediaApi', () => {
  let api: MediaApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(MediaApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('posts media metadata through the generated client', () => {
    api.create({ kind: 'avatar', mime: 'image/jpeg', bytes: 1200 }).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/media`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ kind: 'avatar', mime: 'image/jpeg', bytes: 1200 });
    req.flush(
      {
        mediaId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        uploadUrl: 'https://minio.test/put',
        expiresAt: '2026-08-30T12:00:00Z',
      },
      { status: 201, statusText: 'Created' },
    );
  });

  it('FS-MED-07 gets a signed URL', () => {
    const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    api.url(id).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/media/${id}/url`);
    expect(req.request.method).toBe('GET');
    req.flush({ url: 'https://minio.test/get', expiresAt: '2026-08-30T12:00:01Z' });
  });

  it('maps jpeg/png/webp and rejects oversized files', () => {
    expect(imageMime(new File([new Uint8Array(8)], 'a.jpg', { type: 'image/jpeg' }))).toBe(
      'image/jpeg',
    );
    expect(imageMime(new File([new Uint8Array(8)], 'a.gif', { type: 'image/gif' }))).toBeNull();
    expect(
      rejectIfTooLarge(new File([new Uint8Array(MAX_MEDIA_BYTES + 1)], 'big.jpg')),
    ).not.toBeNull();
    expect(rejectIfTooLarge(new File([new Uint8Array(16)], 'ok.jpg'))).toBeNull();
  });
});
