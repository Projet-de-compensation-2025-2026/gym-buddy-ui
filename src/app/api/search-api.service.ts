import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GymBuddyAPIService } from './generated/client';
import type {
  GetSearchEvents200,
  GetSearchEventsParams,
  GetSearchPeople200,
  GetSearchPeopleParams,
} from './generated/model';

@Injectable({ providedIn: 'root' })
export class SearchApi {
  private readonly client = inject(GymBuddyAPIService);

  people(params?: GetSearchPeopleParams): Observable<GetSearchPeople200> {
    return this.client.getSearchPeople(params);
  }

  events(params?: GetSearchEventsParams): Observable<GetSearchEvents200> {
    return this.client.getSearchEvents(params);
  }
}
