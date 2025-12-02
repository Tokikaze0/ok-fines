import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeroomManagementPage } from './homeroom-management.page';

const routes: Routes = [
  {
    path: '',
    component: HomeroomManagementPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomeroomManagementPageRoutingModule {}
