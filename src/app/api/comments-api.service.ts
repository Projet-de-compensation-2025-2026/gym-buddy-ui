import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GymBuddyAPIService } from './generated/client';
import type {
  GetCommentsIdReplies200,
  GetCommentsIdRepliesParams,
  GetPostsIdComments200,
  GetPostsIdCommentsParams,
  PostPostsIdComments201,
  PostPostsIdCommentsBody,
} from './generated/model';

@Injectable({ providedIn: 'root' })
export class CommentsApi {
  private readonly client = inject(GymBuddyAPIService);

  list(postId: string, params?: GetPostsIdCommentsParams): Observable<GetPostsIdComments200> {
    return this.client.getPostsIdComments(postId, params);
  }

  create(postId: string, body: PostPostsIdCommentsBody): Observable<PostPostsIdComments201> {
    return this.client.postPostsIdComments(postId, body);
  }

  replies(id: string, params?: GetCommentsIdRepliesParams): Observable<GetCommentsIdReplies200> {
    return this.client.getCommentsIdReplies(id, params);
  }

  delete(id: string): Observable<void> {
    return this.client.deleteCommentsId(id);
  }

  like(id: string): Observable<void> {
    return this.client.putCommentsIdLike(id);
  }

  unlike(id: string): Observable<void> {
    return this.client.deleteCommentsIdLike(id);
  }
}
