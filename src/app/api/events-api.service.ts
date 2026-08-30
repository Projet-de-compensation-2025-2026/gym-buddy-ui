import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GymBuddyAPIService } from './generated/client';
import type {
  GetEvents200,
  GetEventsId200,
  GetEventsParams,
  PatchEventsIdBody,
  PostApplicationsIdAccept200,
  PostEvents201,
  PostEventsBody,
  PostEventsIdApplications201,
  PostEventsIdApplicationsBody,
  PostEventsIdCancel200,
  PostEventsIdCancelBody,
} from './generated/model';

@Injectable({ providedIn: 'root' })
export class EventsApi {
  private readonly client = inject(GymBuddyAPIService);

  list(params?: GetEventsParams): Observable<GetEvents200> {
    return this.client.getEvents(params);
  }

  create(body: PostEventsBody): Observable<PostEvents201> {
    return this.client.postEvents(body);
  }

  get(id: string): Observable<GetEventsId200> {
    return this.client.getEventsId(id);
  }

  patch(id: string, body: PatchEventsIdBody): Observable<GetEventsId200> {
    return this.client.patchEventsId(id, body);
  }

  cancel(id: string, body?: PostEventsIdCancelBody): Observable<PostEventsIdCancel200> {
    return this.client.postEventsIdCancel(id, body);
  }

  apply(id: string, body?: PostEventsIdApplicationsBody): Observable<PostEventsIdApplications201> {
    return this.client.postEventsIdApplications(id, body);
  }

  withdraw(applicationId: string): Observable<void> {
    return this.client.deleteApplicationsId(applicationId);
  }

  accept(applicationId: string): Observable<PostApplicationsIdAccept200> {
    return this.client.postApplicationsIdAccept(applicationId);
  }

  decline(applicationId: string): Observable<void> {
    return this.client.postApplicationsIdDecline(applicationId);
  }
}
