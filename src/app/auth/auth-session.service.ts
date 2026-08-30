import { computed, Injectable, signal } from '@angular/core';
import { readAccessPayload } from './jwt';

/** Holds the access JWT in memory only (XSS: do not use localStorage). */
@Injectable({ providedIn: 'root' })
export class AuthSession {
  readonly accessToken = signal<string | null>(null);
  readonly handle = signal<string | null>(null);
  readonly userId = signal<string | null>(null);
  readonly role = signal<string | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly signedIn = computed(() => this.accessToken() !== null);
  readonly isStaff = computed(() => {
    const role = this.role();
    return role === 'admin' || role === 'moderator';
  });
  readonly isAdmin = computed(() => this.role() === 'admin');

  setAccessToken(token: string): void {
    const payload = readAccessPayload(token);
    this.accessToken.set(token);
    this.handle.set(payload?.handle ?? null);
    this.userId.set(payload?.sub ?? null);
    this.role.set(payload?.role ?? 'member');
    this.error.set(null);
  }

  clear(): void {
    this.accessToken.set(null);
    this.handle.set(null);
    this.userId.set(null);
    this.role.set(null);
  }
}
