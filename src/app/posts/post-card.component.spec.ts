import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { samplePost } from '../api/posts-api.service.spec';
import { PostCard } from './post-card.component';

describe('PostCard', () => {
  async function render(likeCount: number, commentCount: number): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [PostCard],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(PostCard);
    fixture.componentRef.setInput('post', { ...samplePost(), likeCount, commentCount });
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('FS-FEED-06 pluralizes like and comment counts', async () => {
    const one = await render(1, 1);
    expect(one.querySelector('[data-testid="like-count"]')?.textContent?.trim()).toBe('1 Like');
    expect(one.querySelector('[data-testid="comment-count"]')?.textContent?.trim()).toBe(
      '1 Comment',
    );

    TestBed.resetTestingModule();
    const many = await render(0, 2);
    expect(many.querySelector('[data-testid="like-count"]')?.textContent?.trim()).toBe('0 Likes');
    expect(many.querySelector('[data-testid="comment-count"]')?.textContent?.trim()).toBe(
      '2 Comments',
    );
  });
});
