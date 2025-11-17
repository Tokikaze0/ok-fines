import { Component, OnInit } from '@angular/core';
import { PaymentService } from '@core/services/payment.service';
import { StudentPaymentSummary, Payment, Fee } from '@core/models/fee.model';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({
    selector: 'app-student-fees',
    templateUrl: './student-fees.page.html',
    styleUrls: ['./student-fees.page.scss'],
    standalone: false
})
export class StudentFeesPage implements OnInit {
    studentId = '';
    summary: StudentPaymentSummary | null = null;
    isLoading = false;
    notFound = false;

    constructor(
        private paymentService: PaymentService,
        private loadingCtrl: LoadingController,
        private toastCtrl: ToastController
    ) { }

    ngOnInit() {
        // Initialize component if needed
    }

    async searchStudent() {
        if (!this.studentId.trim()) {
            await this.showToast('Please enter a Student ID', 'warning');
            return;
        }

        this.isLoading = true;
        const loader = await this.loadingCtrl.create({ message: 'Searching...' });
        await loader.present();

        try {
            this.summary = await this.paymentService.getStudentPaymentSummary(this.studentId);
            this.notFound = false;
            await loader.dismiss();
        } catch (error: any) {
            this.notFound = true;
            this.summary = null;
            await loader.dismiss();
            await this.showToast(error.message || 'Student not found', 'danger');
        } finally {
            this.isLoading = false;
        }
    }

    getPaymentStatus(payment: Payment): string {
        return payment.status === 'paid' ? 'Paid' : 'Unpaid';
    }

    getPaymentStatusColor(payment: Payment): string {
        return payment.status === 'paid' ? 'success' : 'danger';
    }

    getFeeForPayment(payment: Payment): Fee | undefined {
        if (!this.summary) return undefined;
        return this.summary.fees.find(f => f.id === payment.feeId);
    }

    getFeeAmount(payment: Payment): string {
        const fee = this.getFeeForPayment(payment);
        return fee && fee.amount ? fee.amount.toFixed(2) : 'N/A';
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

    reset() {
        this.studentId = '';
        this.summary = null;
        this.notFound = false;
    }
}
