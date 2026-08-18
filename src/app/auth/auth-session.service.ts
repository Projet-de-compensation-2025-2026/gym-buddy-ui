import { computed, Injectable, signal } from '@angular/core';

/** Holds the access JWT in memory only (XSS: do not use localStorage). */
@Injectable({ providedIn: 'root' })
export class AuthSession {
  readonly accessToken = signal<string | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly signedIn = computed(() => this.accessToken() !== null);

  setAccessToken(token: string): void {
    this.accessToken.set(token);
    this.error.set(null);
  }

  clear(): void {
    this.accessToken.set(null);
  }
}
