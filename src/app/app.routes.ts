import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home.component';
import { SignInPage } from './pages/sign-in/sign-in.component';
import { SignUpPage } from './pages/sign-up/sign-up.component';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'register', component: SignUpPage },
  { path: 'login', component: SignInPage },
  { path: '**', redirectTo: '' },
];
