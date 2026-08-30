import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFoundPage } from './not-found.component';

describe('NotFoundPage', () => {
  it('states that the page does not exist and keeps a way back', async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(NotFoundPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="not-found"]')?.textContent).toContain(
      'does not exist',
    );
    expect(root.querySelector('a')?.getAttribute('href')).toContain('/');
  });
});
