import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { EventDetailPage } from './pages/event-detail/event-detail.component';
import { EventNewPage } from './pages/event-new/event-new.component';
import { EventsPage } from './pages/events/events.component';
import { FriendsPage } from './pages/friends/friends.component';
import { HomePage } from './pages/home/home.component';
import { PostDetailPage } from './pages/post-detail/post-detail.component';
import { SuggestionsPage } from './pages/suggestions/suggestions.component';
import { ProfilePage } from './pages/profile/profile.component';
import { SearchPage } from './pages/search/search.component';
import { SettingsPrivacyPage } from './pages/settings-privacy/settings-privacy.component';
import { SettingsProfilePage } from './pages/settings-profile/settings-profile.component';
import { SignInPage } from './pages/sign-in/sign-in.component';
import { SignUpPage } from './pages/sign-up/sign-up.component';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'register', component: SignUpPage },
  { path: 'login', component: SignInPage },
  { path: 'events', component: EventsPage, canActivate: [authGuard] },
  { path: 'events/new', component: EventNewPage, canActivate: [authGuard] },
  { path: 'events/:id', component: EventDetailPage, canActivate: [authGuard] },
  { path: 'friends', component: FriendsPage, canActivate: [authGuard] },
  { path: 'search', component: SearchPage, canActivate: [authGuard] },
  { path: 'suggestions', component: SuggestionsPage, canActivate: [authGuard] },
  { path: 'posts/:id', component: PostDetailPage, canActivate: [authGuard] },
  { path: 'u/:handle', component: ProfilePage, canActivate: [authGuard] },
  { path: 'settings/profile', component: SettingsProfilePage, canActivate: [authGuard] },
  { path: 'settings/privacy', component: SettingsPrivacyPage, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
