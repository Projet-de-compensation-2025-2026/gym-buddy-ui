import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GymBuddyAPIService } from './generated/client';
import type { GetMatchingMe200, GetSuggestions200, GetSuggestionsParams } from './generated/model';

@Injectable({ providedIn: 'root' })
export class SuggestionsApi {
  private readonly client = inject(GymBuddyAPIService);

  list(params?: GetSuggestionsParams): Observable<GetSuggestions200> {
    return this.client.getSuggestions(params);
  }

  dismiss(userId: string): Observable<void> {
    return this.client.postSuggestionsUserIdDismiss(userId);
  }

  matchingMe(): Observable<GetMatchingMe200> {
    return this.client.getMatchingMe();
  }

  optIn(): Observable<void> {
    return this.client.postMatchingOptIn();
  }

  optOut(): Observable<void> {
    return this.client.deleteMatchingOptIn();
  }
}
