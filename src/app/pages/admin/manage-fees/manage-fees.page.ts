import { Component, OnInit, OnDestroy } from '@angular/core';
import { FeeService } from '@core/services/fee.service';
import { Fee } from '@core/models/fee.model';
import { AlertController, LoadingController, ToastController, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-manage-fees',
  templateUrl: './manage-fees.page.html',
  styleUrls: ['./manage-fees.page.scss'],
  standalone: false
})
export class ManageFeesPage implements OnInit, OnDestroy {
  fees: Fee[] = [];
  isLoading = false;
  unsubscribe?: () => void;
  
  newFeeDescription = '';
  newFeeAmount: number | null = null;
  editingFeeId: string | null = null;
  editingDescription = '';
  editingAmount: number | null = null;

  constructor(
    private feeService: FeeService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.loadFees();
  }

  ngOnDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  loadFees() {
    this.isLoading = true;
    this.unsubscribe = this.feeService.subscribeFees(fees => {
      this.fees = fees;
      this.isLoading = false;
    });
  }

  async addFee() {
    if (!this.newFeeDescription.trim() || !this.newFeeAmount || this.newFeeAmount <= 0) {
      await this.showToast('Please fill all fields correctly', 'warning');
      return;
    }

    const loader = await this.loadingCtrl.create({ message: 'Adding fee...' });
    await loader.present();

    try {
      const feeId = await this.feeService.addFee(this.newFeeDescription, this.newFeeAmount);
      await this.feeService.createPaymentsForFee(feeId);
      await this.showToast('Fee added successfully');
      this.newFeeDescription = '';
      this.newFeeAmount = null;
      await loader.dismiss();
    } catch (error: any) {
      await loader.dismiss();
      await this.showToast(error.message || 'Error adding fee', 'danger');
    }
  }

  async editFee(fee: Fee) {
    this.editingFeeId = fee.id || null;
    this.editingDescription = fee.description;
    this.editingAmount = fee.amount;
  }

  async updateFee() {
    if (!this.editingFeeId || !this.editingDescription.trim() || !this.editingAmount || this.editingAmount <= 0) {
      await this.showToast('Please fill all fields correctly', 'warning');
      return;
    }

    const loader = await this.loadingCtrl.create({ message: 'Updating fee...' });
    await loader.present();

    try {
      await this.feeService.updateFee(this.editingFeeId, this.editingDescription, this.editingAmount);
      await this.showToast('Fee updated successfully');
      this.cancelEdit();
      await loader.dismiss();
    } catch (error: any) {
      await loader.dismiss();
      await this.showToast(error.message || 'Error updating fee', 'danger');
    }
  }

  async deleteFee(fee: Fee) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Fee',
      message: `Are you sure you want to delete "${fee.description}"? This will not affect existing payment records.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            if (fee.id) {
              const loader = await this.loadingCtrl.create({ message: 'Deleting...' });
              await loader.present();
              try {
                await this.feeService.deleteFee(fee.id);
                await this.showToast('Fee deleted successfully');
                await loader.dismiss();
              } catch (error: any) {
                await loader.dismiss();
                await this.showToast(error.message || 'Error deleting fee', 'danger');
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }

  cancelEdit() {
    this.editingFeeId = null;
    this.editingDescription = '';
    this.editingAmount = null;
  }

  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
