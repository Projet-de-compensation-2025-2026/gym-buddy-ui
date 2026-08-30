import { Component, inject, signal } from '@angular/core';
import { AdminApi } from '../api/admin-api.service';
import { readApiError } from '../../../src/app/api/models';
import { AuthSession } from '../../../src/app/auth/auth-session.service';

@Component({
  selector: 'admin-fixtures',
  template: `
    <h1>Database Fixtures</h1>
    <p class="muted">Manage non-production test data generation.</p>
    <p class="warn">
      Non-production only. Generating thousands of rows is ticket #70; these buttons record the
      trigger. Disabled on prod (FORBIDDEN).
    </p>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="notice">{{ notice() }}</p>
    }
    @if (!session.isAdmin()) {
      <p class="muted">Only admins can trigger fixtures.</p>
    } @else {
      <div class="actions">
        <button class="btn-primary" type="button" (click)="generate()" [disabled]="busy()">
          Generate fixtures
        </button>
        <button type="button" (click)="reset()" [disabled]="busy()">Reset fixtures</button>
      </div>
    }
  `,
  styles: `
    .warn {
      background: #fedad6;
      color: #8d302f;
      padding: 1rem;
      border-radius: 0.5rem;
    }
    .actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .btn-primary {
      background: #006d77;
      color: #fff;
      border: 0;
      border-radius: 0.25rem;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
    }
  `,
})
export class FixturesPage {
  private readonly api = inject(AdminApi);
  readonly session = inject(AuthSession);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  generate(): void {
    this.run(() => this.api.generateFixtures(), 'Fixture generate recorded.');
  }

  reset(): void {
    this.run(() => this.api.resetFixtures(), 'Fixture reset recorded.');
  }

  private run(call: () => ReturnType<AdminApi['generateFixtures']>, ok: string): void {
    this.busy.set(true);
    this.error.set(null);
    call().subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.set(ok);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(err));
      },
    });
  }
}
