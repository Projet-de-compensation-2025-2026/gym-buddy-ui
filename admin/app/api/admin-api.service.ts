import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GymBuddyAPIService } from '../../../src/app/api/generated/client';
import type {
  GetAdminAudit200,
  GetAdminAuditParams,
  GetAdminMedia200,
  GetAdminMediaParams,
  GetAdminReports200,
  GetAdminReportsParams,
  GetAdminUsers200,
  GetAdminUsersParams,
  PatchAdminUsersIdRole200,
  PatchAdminUsersIdRoleBody,
  PostAdminReportsIdResolve200,
  PostAdminUsersIdLock200,
  PostAdminUsersIdLockBody,
  PostAdminUsersIdUnlock200,
  PostAdminUsersIdUnlockBody,
  PostAdminContentTypeIdHideBody,
} from '../../../src/app/api/generated/model';

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly client = inject(GymBuddyAPIService);

  listUsers(params?: GetAdminUsersParams): Observable<GetAdminUsers200> {
    return this.client.getAdminUsers(params);
  }

  lock(id: string, body?: PostAdminUsersIdLockBody): Observable<PostAdminUsersIdLock200> {
    return this.client.postAdminUsersIdLock(id, body);
  }

  unlock(id: string, body?: PostAdminUsersIdUnlockBody): Observable<PostAdminUsersIdUnlock200> {
    return this.client.postAdminUsersIdUnlock(id, body);
  }

  changeRole(id: string, body: PatchAdminUsersIdRoleBody): Observable<PatchAdminUsersIdRole200> {
    return this.client.patchAdminUsersIdRole(id, body);
  }

  hide(type: string, id: string, body: PostAdminContentTypeIdHideBody): Observable<void> {
    return this.client.postAdminContentTypeIdHide(
      type as 'post' | 'comment' | 'event' | 'media',
      id,
      body,
    );
  }

  unhide(type: string, id: string): Observable<void> {
    return this.client.postAdminContentTypeIdUnhide(
      type as 'post' | 'comment' | 'event' | 'media',
      id,
    );
  }

  listReports(params?: GetAdminReportsParams): Observable<GetAdminReports200> {
    return this.client.getAdminReports(params);
  }

  resolve(id: string): Observable<PostAdminReportsIdResolve200> {
    return this.client.postAdminReportsIdResolve(id);
  }

  listMedia(params?: GetAdminMediaParams): Observable<GetAdminMedia200> {
    return this.client.getAdminMedia(params);
  }

  generateFixtures(): Observable<void> {
    return this.client.postAdminFixtures();
  }

  resetFixtures(): Observable<void> {
    return this.client.postAdminFixturesReset();
  }

  listAudit(params?: GetAdminAuditParams): Observable<GetAdminAudit200> {
    return this.client.getAdminAudit(params);
  }
}
