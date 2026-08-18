import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSession } from '../../auth/auth-session.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
})
export class HomePage {
  protected readonly session = inject(AuthSession);
}
