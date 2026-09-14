import { inject, Injectable } from '@angular/core';
import { EMPTY, Observable, expand, reduce } from 'rxjs';
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

  listAll(params: GetFriendshipsParams): Observable<GetFriendships200> {
    return this.list({ ...params, size: 50 }).pipe(
      expand((page) =>
        page.page.next ? this.list({ ...params, size: 50, after: page.page.next }) : EMPTY,
      ),
      reduce((all, page) => ({ data: [...all.data, ...page.data], page: page.page }), {
        data: [],
        page: { next: null, size: 50 },
      } as GetFriendships200),
    );
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

  unblock(userId: string): Observable<void> {
    return this.client.deleteBlocksUserId(userId);
  }
}
