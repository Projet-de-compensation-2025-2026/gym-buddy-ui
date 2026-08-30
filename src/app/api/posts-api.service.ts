import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GymBuddyAPIService } from './generated/client';
import type { GetPostsId200, GetPostsIdLikes200, PostPostsBody } from './generated/model';

@Injectable({ providedIn: 'root' })
export class PostsApi {
  private readonly client = inject(GymBuddyAPIService);

  create(body: PostPostsBody): Observable<GetPostsId200> {
    return this.client.postPosts(body);
  }

  get(id: string): Observable<GetPostsId200> {
    return this.client.getPostsId(id);
  }

  like(id: string): Observable<void> {
    return this.client.putPostsIdLike(id);
  }

  unlike(id: string): Observable<void> {
    return this.client.deletePostsIdLike(id);
  }

  repost(id: string): Observable<GetPostsId200> {
    return this.client.postPostsIdReposts(id);
  }

  unrepost(id: string): Observable<void> {
    return this.client.deletePostsIdReposts(id);
  }

  likes(id: string): Observable<GetPostsIdLikes200> {
    return this.client.getPostsIdLikes(id);
  }
}
