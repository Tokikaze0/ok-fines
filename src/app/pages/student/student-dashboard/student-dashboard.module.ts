import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StudentDashboardPage } from './student-dashboard.page';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule.forChild([
            {
                path: '',
                component: StudentDashboardPage
            }
        ])
    ],
    declarations: [StudentDashboardPage]
})
export class StudentDashboardPageModule { }
