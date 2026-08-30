import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GymBuddyAPIService } from './generated/client';
import type {
  GetProfilesHandle200,
  GetProfilesMe200,
  PatchProfilesMe200,
  PatchProfilesMeBody,
} from './generated/model';

@Injectable({ providedIn: 'root' })
export class ProfilesApi {
  private readonly client = inject(GymBuddyAPIService);

  me(): Observable<GetProfilesMe200> {
    return this.client.getProfilesMe();
  }

  byHandle(handle: string): Observable<GetProfilesHandle200> {
    return this.client.getProfilesHandle(handle);
  }

  patchMe(body: PatchProfilesMeBody): Observable<PatchProfilesMe200> {
    return this.client.patchProfilesMe(body);
  }
}
