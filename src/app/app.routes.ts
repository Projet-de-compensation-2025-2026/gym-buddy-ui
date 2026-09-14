import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { HomePage } from './pages/home/home.component';

export const routes: Routes = [
  { path: '', component: HomePage },
  {
    path: 'register',
    loadComponent: () => import('./pages/sign-up/sign-up.component').then((m) => m.SignUpPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/sign-in/sign-in.component').then((m) => m.SignInPage),
  },
  {
    path: 'events',
    loadComponent: () => import('./pages/events/events.component').then((m) => m.EventsPage),
    canActivate: [authGuard],
  },
  {
    path: 'events/new',
    loadComponent: () =>
      import('./pages/event-new/event-new.component').then((m) => m.EventNewPage),
    canActivate: [authGuard],
  },
  {
    path: 'events/:id',
    loadComponent: () =>
      import('./pages/event-detail/event-detail.component').then((m) => m.EventDetailPage),
    canActivate: [authGuard],
  },
  {
    path: 'friends',
    loadComponent: () => import('./pages/friends/friends.component').then((m) => m.FriendsPage),
    canActivate: [authGuard],
  },
  {
    path: 'friends/suggestions',
    loadComponent: () =>
      import('./pages/suggestions/suggestions.component').then((m) => m.SuggestionsPage),
    canActivate: [authGuard],
  },
  {
    path: 'search',
    loadComponent: () => import('./pages/search/search.component').then((m) => m.SearchPage),
    canActivate: [authGuard],
  },
  {
    path: 'messages',
    loadComponent: () => import('./pages/inbox/inbox.component').then((m) => m.InboxPage),
    canActivate: [authGuard],
  },
  {
    path: 'messages/:id',
    loadComponent: () => import('./pages/chat/chat.component').then((m) => m.ChatPage),
    canActivate: [authGuard],
  },
  { path: 'inbox', redirectTo: 'messages', pathMatch: 'full' },
  { path: 'inbox/:id', redirectTo: 'messages/:id' },
  {
    path: 'suggestions',
    loadComponent: () =>
      import('./pages/suggestions/suggestions.component').then((m) => m.SuggestionsPage),
    canActivate: [authGuard],
  },
  {
    path: 'posts/:id',
    loadComponent: () =>
      import('./pages/post-detail/post-detail.component').then((m) => m.PostDetailPage),
    canActivate: [authGuard],
  },
  {
    path: 'u/:handle',
    loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfilePage),
    canActivate: [authGuard],
  },
  { path: 'settings', redirectTo: 'settings/profile', pathMatch: 'full' },
  {
    path: 'settings/profile',
    loadComponent: () =>
      import('./pages/settings-profile/settings-profile.component').then(
        (m) => m.SettingsProfilePage,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'settings/privacy',
    loadComponent: () =>
      import('./pages/settings-privacy/settings-privacy.component').then(
        (m) => m.SettingsPrivacyPage,
      ),
    canActivate: [authGuard],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then((m) => m.NotFoundPage),
  },
];
