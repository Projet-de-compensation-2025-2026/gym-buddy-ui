import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-suggestions',
  imports: [RouterLink],
  template: `
    <section class="card" data-testid="suggestions-page">
      <h1>Friend suggestions</h1>
      <p class="muted">
        Suggested gym buddies land in a later slice. You can still grow your feed from Friends.
      </p>
      <p>
        <a routerLink="/" data-testid="suggestions-back">Back to feed</a>
        ·
        <a routerLink="/friends">Friends</a>
      </p>
    </section>
  `,
})
export class SuggestionsPage {}
