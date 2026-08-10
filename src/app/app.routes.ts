import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth.service';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'flats',
        loadComponent: () =>
          import('./pages/flats/flats.component').then((m) => m.FlatsComponent)
      },
      {
        path: 'receipts',
        loadComponent: () =>
          import('./pages/receipts/receipts.component').then((m) => m.ReceiptsComponent)
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./pages/expenses/expenses.component').then((m) => m.ExpensesComponent)
      },
      {
        path: 'partners',
        loadComponent: () =>
          import('./pages/partners/partners.component').then((m) => m.PartnersComponent)
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/users/users.component').then((m) => m.UsersComponent)
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  },
  { path: '**', redirectTo: '' }
];
