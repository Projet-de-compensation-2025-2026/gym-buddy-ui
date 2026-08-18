import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthApi } from './api/auth-api.service';
import { readApiError } from './api/models';
import { AuthSession } from './auth/auth-session.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class App {
  protected readonly session = inject(AuthSession);
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  logout(): void {
    this.session.busy.set(true);
    this.session.error.set(null);
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
