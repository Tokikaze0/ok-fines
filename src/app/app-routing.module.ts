import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AdminGuard } from '@core/guards/admin.guard';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./register/register.module').then(m => m.RegisterPageModule)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./pages/admin/dashboard/dashboard.module').then(m => m.DashboardPageModule),
    canActivate: [AdminGuard]
  },
  {
    path: 'survey',
    loadChildren: () => import('./survey/survey.module').then(m => m.SurveyPageModule)
  },
  {
    path: 'student-user-management',
    loadChildren: () => import('./pages/admin/student-user-management/student-user-management.module').then(m => m.StudentUserManagementPageModule),
    canActivate: [AdminGuard]
  },
  {
    path: 'manage-fees',
    loadChildren: () => import('./pages/admin/manage-fees/manage-fees.module').then(m => m.ManageFeesPageModule),
    canActivate: [AdminGuard]
  },
  {
    path: 'track-payments',
    loadChildren: () => import('./pages/admin/track-payments/track-payments.module').then(m => m.TrackPaymentsPageModule),
    canActivate: [AdminGuard]
  },
  {
    path: 'outstanding-report',
    loadChildren: () => import('./pages/admin/outstanding-report/outstanding-report.module').then(m => m.OutstandingReportPageModule),
    canActivate: [AdminGuard]
  },
  {
    path: 'homeroom-dashboard',
    loadChildren: () => import('./pages/homeroom/homeroom-dashboard/homeroom-dashboard.module').then(m => m.HomeroomDashboardPageModule)
  },
  {
    path: 'student-dashboard',
    loadChildren: () => import('./pages/student/student-dashboard/student-dashboard.module').then(m => m.StudentDashboardPageModule)
  },
  {
    path: 'student-fees',
    loadChildren: () => import('./pages/student/student-fees/student-fees.module').then(m => m.StudentFeesPageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
