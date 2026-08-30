import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GymBuddyAPIService } from './generated/client';
import type {
  GetConversations200,
  GetConversationsIdMessages200,
  GetConversationsIdMessagesParams,
  GetConversationsParams,
  PostConversations201,
  PostConversationsBody,
  PostConversationsIdMessages201,
  PostConversationsIdMessagesBody,
} from './generated/model';

@Injectable({ providedIn: 'root' })
export class MessagingApi {
  private readonly client = inject(GymBuddyAPIService);

  inbox(params?: GetConversationsParams): Observable<GetConversations200> {
    return this.client.getConversations(params);
  }

  open(body: PostConversationsBody): Observable<PostConversations201> {
    return this.client.postConversations(body);
  }

  messages(
    id: string,
    params?: GetConversationsIdMessagesParams,
  ): Observable<GetConversationsIdMessages200> {
    return this.client.getConversationsIdMessages(id, params);
  }

  send(
    id: string,
    body: PostConversationsIdMessagesBody,
  ): Observable<PostConversationsIdMessages201> {
    return this.client.postConversationsIdMessages(id, body);
  }

  remove(id: string): Observable<void> {
    return this.client.deleteMessagesId(id);
  }
}
