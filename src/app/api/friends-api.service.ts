import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GymBuddyAPIService } from './generated/client';
import type {
  GetFriendships200,
  GetFriendshipsParams,
  PostBlocksBody,
  PostFriendships201,
  PostFriendshipsBody,
  PostFriendshipsIdAccept200,
} from './generated/model';

@Injectable({ providedIn: 'root' })
export class FriendsApi {
  private readonly client = inject(GymBuddyAPIService);

  list(params?: GetFriendshipsParams): Observable<GetFriendships200> {
    return this.client.getFriendships(params);
  }

  request(body: PostFriendshipsBody): Observable<PostFriendships201> {
    return this.client.postFriendships(body);
  }

  accept(id: string): Observable<PostFriendshipsIdAccept200> {
    return this.client.postFriendshipsIdAccept(id);
  }

  decline(id: string): Observable<void> {
    return this.client.postFriendshipsIdDecline(id);
  }

  remove(id: string): Observable<void> {
    return this.client.deleteFriendshipsId(id);
  }

  block(body: PostBlocksBody): Observable<void> {
    return this.client.postBlocks(body);
  }
}
