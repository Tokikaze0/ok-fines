import { Component, OnInit, OnDestroy } from '@angular/core';
import { PaymentService } from '@core/services/payment.service';
import { FeeService } from '@core/services/fee.service';
import { Payment, Fee } from '@core/models/fee.model';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-track-payments',
  templateUrl: './track-payments.page.html',
  styleUrls: ['./track-payments.page.scss'],
  standalone: false
})
export class TrackPaymentsPage implements OnInit, OnDestroy {
  payments: Payment[] = [];
  fees: Fee[] = [];
  isLoading = false;
  unsubscribePayments?: () => void;
  unsubscribeFees?: () => void;

  selectedPaymentId: string | null = null;
  selectedStatus: 'paid' | 'unpaid' = 'unpaid';
  notes = '';

  constructor(
    private paymentService: PaymentService,
    private feeService: FeeService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    if (this.unsubscribePayments) this.unsubscribePayments();
    if (this.unsubscribeFees) this.unsubscribeFees();
  }

  loadData() {
    this.isLoading = true;
    this.unsubscribePayments = this.paymentService.subscribePayments(payments => {
      this.payments = payments;
      this.isLoading = false;
    });

    this.unsubscribeFees = this.feeService.subscribeFees(fees => {
      this.fees = fees;
    });
  }

  getFeeName(feeId: string): string {
    const fee = this.fees.find(f => f.id === feeId);
    return fee ? fee.description : 'Unknown';
  }

  getFeeAmount(feeId: string): number {
    const fee = this.fees.find(f => f.id === feeId);
    return fee ? fee.amount : 0;
  }

  getStatusBadgeColor(status: string): string {
    return status === 'paid' ? 'success' : 'danger';
  }

  selectPayment(payment: Payment) {
    this.selectedPaymentId = payment.id || null;
    this.selectedStatus = payment.status;
    this.notes = payment.notes || '';
  }

  cancelSelect() {
    this.selectedPaymentId = null;
    this.selectedStatus = 'unpaid';
    this.notes = '';
  }

  async updatePaymentStatus() {
    if (!this.selectedPaymentId) {
      await this.showToast('No payment selected', 'warning');
      return;
    }

    const loader = await this.loadingCtrl.create({ message: 'Updating...' });
    await loader.present();

    try {
      await this.paymentService.updatePaymentStatus(
        this.selectedPaymentId,
        this.selectedStatus,
        this.notes
      );
      await this.showToast('Payment updated successfully');
      this.cancelSelect();
      await loader.dismiss();
    } catch (error: any) {
      await loader.dismiss();
      await this.showToast(error.message || 'Error updating payment', 'danger');
    }
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
