import { Component, OnInit } from '@angular/core';
import { PaymentService } from '@core/services/payment.service';
import { StudentPaymentSummary } from '@core/models/fee.model';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-outstanding-report',
  templateUrl: './outstanding-report.page.html',
  styleUrls: ['./outstanding-report.page.scss'],
  standalone: false
})
export class OutstandingReportPage implements OnInit {
  outstandingData: StudentPaymentSummary[] = [];
  filteredData: StudentPaymentSummary[] = [];
  isLoading = false;
  totalOutstanding = 0;
  searchTerm = '';

  constructor(
    private paymentService: PaymentService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.loadReport();
  }

  async loadReport() {
    this.isLoading = true;
    const loader = await this.loadingCtrl.create({ message: 'Loading report...' });
    await loader.present();

    try {
      this.outstandingData = await this.paymentService.getOutstandingBalanceReport();
      this.filterData();
      this.calculateTotal();
      await loader.dismiss();
    } catch (error: any) {
      await loader.dismiss();
      await this.showToast(error.message || 'Error loading report', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  filterData() {
    let data = this.outstandingData;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      data = data.filter(
        item =>
          item.studentId.toLowerCase().includes(term) ||
          item.email.toLowerCase().includes(term) ||
          (item.fullName && item.fullName.toLowerCase().includes(term)) ||
          (item.society && item.society.toLowerCase().includes(term))
      );
    }

    // Only show students with outstanding balance in the UI
    this.filteredData = data.filter(item => item.totalUnpaid > 0);
    
    this.calculateTotal();
  }

  calculateTotal() {
    this.totalOutstanding = this.filteredData.reduce((sum, item) => sum + item.totalUnpaid, 0);
  }

  onSearchChange() {
    this.filterData();
  }

  async exportCSV() {
    try {
      if (this.outstandingData.length === 0) {
        await this.showToast('No data to export', 'warning');
        return;
      }

      // 1. Get all unique fees (columns)
      const allFees = this.outstandingData[0].fees;

      // 2. Build Header
      const header = [
        'Full Name',
        ...allFees.map(f => f.description),
        'Total Paid',
        'Total Unpaid',
        'Status'
      ];

      // 3. Build Rows
      const rows = this.outstandingData.map(student => {
        const feeColumns = allFees.map(fee => {
          // Find payment for this fee
          const payment = student.payments.find(p => p.feeId === fee.id);
          
          if (!payment) {
            return 'N/A'; // Fee didn't apply to this student
          }
          
          return payment.status === 'paid' ? 'Paid' : 'Unpaid';
        });

        const status = student.totalUnpaid === 0 ? 'Completed' : 'Incomplete';

        return [
          student.fullName || student.studentId,
          ...feeColumns,
          student.totalPaid.toFixed(2),
          student.totalUnpaid.toFixed(2),
          status
        ];
      });

      const csvContent = [
        header.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `outstanding-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      await this.showToast('CSV exported successfully');
    } catch (error: any) {
      await this.showToast(error.message || 'Error exporting CSV', 'danger');
    }
  }

  async printReport() {
    window.print();
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
