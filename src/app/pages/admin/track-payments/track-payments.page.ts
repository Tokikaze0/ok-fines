import { Component, OnInit, OnDestroy } from '@angular/core';
import { PaymentService } from '@core/services/payment.service';
import { FeeService } from '@core/services/fee.service';
import { UserManagementService } from '@core/services/user-management.service';
import { AuthService } from '@core/services/auth.service';
import { Fee } from '@core/models/fee.model';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-track-payments',
  templateUrl: './track-payments.page.html',
  styleUrls: ['./track-payments.page.scss'],
  standalone: false
})
export class TrackPaymentsPage implements OnInit, OnDestroy {
  fees: Fee[] = [];
  students: any[] = [];
  groupedStudents: { groupName: string, students: any[] }[] = [];
  isLoading = false;
  selectedFeeId: string | null = null;
  currentUser: any = null;
  currentUserRole: string = '';
  filterStatus: string = 'all';
  filterSection: string = 'all';
  availableSections: string[] = [];
  unsubscribeFees?: () => void;

  constructor(
    private paymentService: PaymentService,
    private feeService: FeeService,
    private userManagementService: UserManagementService,
    private authService: AuthService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    const user = this.authService.auth.currentUser;
    if (user) {
      this.currentUser = await this.authService.getUserProfile(user.uid);
      this.currentUserRole = this.currentUser?.role || '';
    }
    this.loadFees();
  }

  ngOnDestroy() {
    if (this.unsubscribeFees) this.unsubscribeFees();
  }

  loadFees() {
    const societyId = this.currentUser?.societyId;
    this.unsubscribeFees = this.feeService.subscribeFees(fees => {
      this.fees = fees;
    }, societyId);
  }

  async onFeeChange() {
    if (!this.selectedFeeId) return;
    await this.loadStudentsAndPayments();
  }

  async loadStudentsAndPayments() {
    this.isLoading = true;
    try {
      const selectedFee = this.fees.find(f => f.id === this.selectedFeeId);

      // 1. Fetch Students based on Role
      let studentsRaw: any[] = [];
      
      if (this.currentUserRole === 'admin') {
        studentsRaw = await this.userManagementService.getAllStudentsFromCollection();

        // Filter by Fee Target if applicable
        if (selectedFee) {
            if (selectedFee.targetYearLevel) {
                studentsRaw = studentsRaw.filter(s => String(s.yearLevelId) === String(selectedFee.targetYearLevel));
            }
            if (selectedFee.targetSection) {
                studentsRaw = studentsRaw.filter(s => String(s.sectionId) === String(selectedFee.targetSection));
            }
        }

      } else if (this.currentUserRole === 'homeroom') {
        if (this.currentUser && this.currentUser.yearLevelId && this.currentUser.sectionId) {
             studentsRaw = await this.userManagementService.getStudentsBySection(this.currentUser.yearLevelId, this.currentUser.sectionId);
        } else {
            this.showToast('Homeroom configuration missing (Year/Section)', 'danger');
            this.isLoading = false;
            return;
        }
      }

      // 2. Fetch Payments for this Fee
      const payments = await this.paymentService.getPaymentsByFee(this.selectedFeeId!);

      // 3. Merge
      this.students = studentsRaw.map(student => {
        const payment = payments.find(p => p.studentId === student.studentId);
        return {
          ...student,
          paymentStatus: payment ? payment.status : 'unpaid',
          paymentId: payment ? payment.id : null,
          paymentNotes: payment ? payment.notes : ''
        };
      });

      // Extract available sections
      const sections = new Set<string>();
      this.students.forEach(s => {
        sections.add(`Year ${s.yearLevelId || '?'} - Section ${s.sectionId || '?'}`);
      });
      this.availableSections = Array.from(sections).sort();

      this.groupStudents();

    } catch (error) {
      console.error(error);
      this.showToast('Error loading data', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  groupStudents() {
    // 1. Filter based on radio button selection
    let filtered = this.students;
    if (this.filterStatus === 'paid') {
      filtered = this.students.filter(s => s.paymentStatus === 'paid');
    } else if (this.filterStatus === 'unpaid') {
      filtered = this.students.filter(s => s.paymentStatus !== 'paid');
    }

    // Filter by Section
    if (this.filterSection !== 'all') {
        filtered = filtered.filter(s => {
            const key = `Year ${s.yearLevelId || '?'} - Section ${s.sectionId || '?'}`;
            return key === this.filterSection;
        });
    }

    // 2. Sort by Year, then Section, then Name
    filtered.sort((a, b) => {
        const yearA = Number(a.yearLevelId) || 0;
        const yearB = Number(b.yearLevelId) || 0;
        if (yearA !== yearB) return yearA - yearB;

        const secA = (a.sectionId || '').toString();
        const secB = (b.sectionId || '').toString();
        if (secA < secB) return -1;
        if (secA > secB) return 1;

        return (a.fullName || '').localeCompare(b.fullName || '');
    });

    const groups: { [key: string]: any[] } = {};
    
    filtered.forEach(student => {
        const key = `Year ${student.yearLevelId || '?'} - Section ${student.sectionId || '?'}`;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(student);
    });

    this.groupedStudents = Object.keys(groups).map(key => ({
        groupName: key,
        students: groups[key]
    }));
  }

  onFilterChange() {
    this.groupStudents();
  }

  async toggleStatus(student: any) {
    if (this.isLoading) return;

    const currentStatus = student.paymentStatus;
    let newStatus: 'paid' | 'unpaid' | 'pending' = 'unpaid';

    // Logic State Machine
    if (this.currentUserRole === 'admin') {
        // Admin: Unpaid/Pending -> Paid. Paid -> Unpaid.
        if (currentStatus === 'paid') newStatus = 'unpaid';
        else newStatus = 'paid';
    } else {
        // Homeroom: Unpaid -> Pending. Pending -> Unpaid. Paid -> Locked.
        if (currentStatus === 'paid') return; // Locked
        if (currentStatus === 'pending') newStatus = 'unpaid';
        else newStatus = 'pending';
    }

    // Optimistic Update
    const originalStatus = student.paymentStatus;
    student.paymentStatus = newStatus;

    try {
        if (student.paymentId) {
            await this.paymentService.updatePaymentStatus(student.paymentId, newStatus);
        } else {
            // Create new payment
            const paymentId = await this.paymentService.createPayment({
                studentId: student.studentId,
                feeId: this.selectedFeeId!,
                status: newStatus,
                createdAt: new Date().toISOString()
            });
            student.paymentId = paymentId;
        }
    } catch (e) {
        // Revert on error
        student.paymentStatus = originalStatus;
        this.showToast('Failed to update status', 'danger');
    }
  }

  isCheckboxChecked(status: string): boolean {
    if (this.currentUserRole === 'admin') {
      return status === 'paid';
    } else {
      // Homeroom sees checked if Pending or Paid
      return status === 'pending' || status === 'paid';
    }
  }

  isCheckboxDisabled(status: string): boolean {
    if (this.currentUserRole === 'homeroom') {
      return status === 'paid'; // Homeroom cannot touch Paid items
    }
    return false;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      default: return 'medium';
    }
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color
    });
    toast.present();
  }
}
