import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthApi } from '../../src/app/api/auth-api.service';
import { readApiError } from '../../src/app/api/models';
import { AuthSession } from '../../src/app/auth/auth-session.service';

@Component({
  selector: 'admin-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AdminApp {
  protected readonly session = inject(AuthSession);
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  logout(): void {
    this.session.busy.set(true);
    this.api.logout().subscribe({
      next: () => this.afterLogout(),
      error: (err: unknown) => {
        this.session.error.set(readApiError(err));
        this.afterLogout();
      },
    });
  }

  private afterLogout(): void {
    this.session.clear();
    this.session.busy.set(false);
    void this.router.navigateByUrl('/login');
  }
}
