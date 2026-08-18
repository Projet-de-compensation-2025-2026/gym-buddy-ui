import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GymBuddyAPIService } from './generated/client';
import type {
  AccessTokenResponse,
  HealthStatus,
  LoginRequest,
  RegisterRequest,
  RegisteredUser,
} from './generated/model';

const cookieAuth = { withCredentials: true } as const;

/**
 * Thin wrapper over the orval-generated {@link GymBuddyAPIService}.
 * Login / refresh / logout send the HttpOnly refresh cookie (`path /api/v1/auth`).
 */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly client = inject(GymBuddyAPIService);

  register(body: RegisterRequest): Observable<RegisteredUser> {
    return this.client.postAuthRegister(body);
  }

  login(body: LoginRequest): Observable<AccessTokenResponse> {
    return this.client.postAuthLogin(body, cookieAuth);
  }

  refresh(): Observable<AccessTokenResponse> {
    return this.client.postAuthRefresh(cookieAuth);
  }

  logout(): Observable<void> {
    return this.client.postAuthLogout(cookieAuth);
  }

  health(): Observable<HealthStatus> {
    return this.client.getHealthz();
  }
}
