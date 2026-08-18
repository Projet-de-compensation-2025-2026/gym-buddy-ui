import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccessTokenResponse, LoginRequest, RegisterRequest, RegisteredUser } from './models';

/**
 * Typed client for POST /api/v1/auth/{register,login,refresh,logout}.
 * Shapes: https://github.com/Projet-de-compensation-2025-2026/gym-buddy-openapi
 * Refresh and logout are cookie-only (path /api/v1/auth).
 */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/auth`;

  register(body: RegisterRequest): Observable<RegisteredUser> {
    return this.http.post<RegisteredUser>(`${this.base}/register`, body);
  }

  login(body: LoginRequest): Observable<AccessTokenResponse> {
    return this.http.post<AccessTokenResponse>(`${this.base}/login`, body, {
      withCredentials: true,
    });
  }

  refresh(): Observable<AccessTokenResponse> {
    return this.http.post<AccessTokenResponse>(`${this.base}/refresh`, null, {
      withCredentials: true,
    });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/logout`, null, { withCredentials: true });
  }
}
