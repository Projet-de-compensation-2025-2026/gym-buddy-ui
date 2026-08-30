import { Routes } from '@angular/router';
import { adminGuard } from './admin.guard';
import { staffGuard } from './staff.guard';
import { AuditPage } from './pages/audit.page';
import { ContentPage } from './pages/content.page';
import { FixturesPage } from './pages/fixtures.page';
import { LoginPage } from './pages/login.page';
import { MediaPage } from './pages/media.page';
import { ReportsPage } from './pages/reports.page';
import { UsersPage } from './pages/users.page';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  { path: 'users', component: UsersPage, canActivate: [staffGuard] },
  { path: 'content', component: ContentPage, canActivate: [staffGuard] },
  { path: 'reports', component: ReportsPage, canActivate: [staffGuard] },
  { path: 'media', component: MediaPage, canActivate: [staffGuard] },
  { path: 'fixtures', component: FixturesPage, canActivate: [staffGuard, adminGuard] },
  { path: 'audit', component: AuditPage, canActivate: [staffGuard, adminGuard] },
  { path: '**', redirectTo: 'users' },
];
