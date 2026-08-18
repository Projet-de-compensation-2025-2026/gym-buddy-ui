import { Component, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-password-field',
  imports: [ReactiveFormsModule],
  templateUrl: './password-field.html',
  styleUrl: './password-field.css',
})
export class PasswordField {
  readonly control = input.required<FormControl<string>>();
  readonly autocomplete = input.required<string>();
  readonly testId = input.required<string>();

  readonly visible = signal(false);

  toggleVisibility(): void {
    this.visible.update((shown) => !shown);
  }
}
