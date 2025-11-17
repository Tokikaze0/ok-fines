import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HomeroomDashboardPage } from './homeroom-dashboard.page';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule.forChild([
            {
                path: '',
                component: HomeroomDashboardPage
            }
        ])
    ],
    declarations: [HomeroomDashboardPage]
})
export class HomeroomDashboardPageModule { }
