import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HomeroomManagementPageRoutingModule } from './homeroom-management-routing.module';

import { HomeroomManagementPage } from './homeroom-management.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomeroomManagementPageRoutingModule
  ],
  declarations: [HomeroomManagementPage]
})
export class HomeroomManagementPageModule {}
