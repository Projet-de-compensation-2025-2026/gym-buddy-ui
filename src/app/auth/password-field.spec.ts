import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { PasswordField } from './password-field';

@Component({
  imports: [PasswordField, ReactiveFormsModule],
  template: `
    <form>
      <app-password-field [control]="password" autocomplete="current-password" testId="password" />
      <button type="submit" data-testid="host-submit">Submit</button>
    </form>
  `,
})
class HostPage {
  readonly password = new FormControl('', { nonNullable: true });
}

describe('PasswordField', () => {
  async function setup(): Promise<{
    host: HostPage;
    root: HTMLElement;
    detect: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [HostPage],
    }).compileComponents();

    const fixture = TestBed.createComponent(HostPage);
    fixture.detectChanges();
    return {
      host: fixture.componentInstance,
      root: fixture.nativeElement as HTMLElement,
      detect: () => fixture.detectChanges(),
    };
  }

  function field(root: HTMLElement): HTMLInputElement {
    return root.querySelector<HTMLInputElement>('[data-testid="password"]')!;
  }

  function toggle(root: HTMLElement): HTMLButtonElement {
    return root.querySelector<HTMLButtonElement>('[data-testid="password-visibility"]')!;
  }

  it('hides the typed password until the eye is pressed', async () => {
    const { root, host, detect } = await setup();
    host.password.setValue('longenough1');
    detect();

    expect(field(root).type).toBe('password');
    expect(toggle(root).type).toBe('button');
    expect(toggle(root).getAttribute('aria-label')).toBe('Show password');
    expect(toggle(root).getAttribute('aria-pressed')).toBe('false');
    expect(toggle(root).getAttribute('aria-controls')).toBe('password');

    toggle(root).click();
    detect();

    expect(field(root).type).toBe('text');
    expect(field(root).value).toBe('longenough1');
    expect(toggle(root).getAttribute('aria-label')).toBe('Hide password');
    expect(toggle(root).getAttribute('aria-pressed')).toBe('true');

    toggle(root).click();
    detect();

    expect(field(root).type).toBe('password');
    expect(field(root).value).toBe('longenough1');
  });

  it('does not submit the surrounding form when the eye is pressed', async () => {
    const { root, detect } = await setup();
    const form = root.querySelector('form')!;
    const submitted = jasmine.createSpy('submit');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted();
    });

    toggle(root).click();
    detect();

    expect(submitted).not.toHaveBeenCalled();
    expect(field(root).type).toBe('text');
  });
});
