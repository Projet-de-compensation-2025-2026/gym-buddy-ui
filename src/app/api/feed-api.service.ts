import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GymBuddyAPIService } from './generated/client';
import type { GetFeed200, GetFeedParams } from './generated/model';

@Injectable({ providedIn: 'root' })
export class FeedApi {
  private readonly client = inject(GymBuddyAPIService);

  list(params?: GetFeedParams): Observable<GetFeed200> {
    return this.client.getFeed(params);
  }
}
