import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TrackPaymentsPage } from './track-payments.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: TrackPaymentsPage
      }
    ])
  ],
  declarations: [TrackPaymentsPage]
})
export class TrackPaymentsPageModule {}
