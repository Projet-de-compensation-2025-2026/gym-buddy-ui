import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GymBuddyAPIService } from '../api/generated/client';
import type { PostReportsBodyTargetType } from '../api/generated/model';
import { readApiError } from '../api/models';

@Component({
  selector: 'app-report-button',
  imports: [FormsModule],
  template: `
    @if (sent()) {
      <p role="status">Report sent. Staff will review it.</p>
    } @else if (open()) {
      <form (submit)="$event.preventDefault(); submit()">
        <label
          >Reason for reporting this {{ targetType() }}
          <textarea
            name="reason"
            rows="3"
            maxlength="1000"
            required
            [(ngModel)]="reason"
          ></textarea>
        </label>
        <div class="buttons">
          <button class="btn-secondary" [disabled]="busy() || !reason().trim()">Send report</button>
          <button class="text-btn" type="button" [disabled]="busy()" (click)="open.set(false)">
            Cancel
          </button>
        </div>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
      </form>
    } @else {
      <button class="text-btn" type="button" (click)="open.set(true)">
        Report {{ targetType() }}
      </button>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    form,
    label {
      display: grid;
      gap: 0.5rem;
    }
    form {
      padding: 0.75rem 0;
    }
    textarea {
      width: 100%;
    }
    .buttons {
      display: flex;
      gap: 0.75rem;
    }
    .text-btn {
      border: 0;
      background: transparent;
      padding: 0.3rem 0;
      color: #60666a;
      font-size: 0.8rem;
      cursor: pointer;
    }
    p {
      font-size: 0.85rem;
    }
  `,
})
export class ReportButton {
  private readonly client = inject(GymBuddyAPIService);
  readonly targetType = input.required<PostReportsBodyTargetType>();
  readonly targetId = input.required<string>();
  readonly open = signal(false);
  readonly reason = signal('');
  readonly busy = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    const reason = this.reason().trim();
    if (!reason || reason.length > 1000 || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.client
      .postReports({ targetType: this.targetType(), targetId: this.targetId(), reason })
      .subscribe({
        next: () => {
          this.sent.set(true);
          this.busy.set(false);
        },
        error: (err: unknown) => {
          this.error.set(readApiError(err));
          this.busy.set(false);
        },
      });
  }
}
