import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StudentUserManagementPage } from './student-user-management.page';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild([
    { path: '', component: StudentUserManagementPage }
  ])],
  declarations: [StudentUserManagementPage],
  exports: [StudentUserManagementPage]
})
export class StudentUserManagementPageModule {}
