import { Injectable } from '@angular/core';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  onSnapshot,
  Query
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { environment } from '../../../environments/environment';
import { Payment, StudentPaymentSummary } from '../models/fee.model';
import { User } from '../models/user.model';
import { FeeService } from './fee.service';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private app = initializeApp(environment.firebaseConfig);
  private firestore = getFirestore(this.app);
  private auth = getAuth(this.app);

  constructor(private feeService: FeeService) {}

  /**
   * Get all payments
   */
  async getAllPayments(): Promise<Payment[]> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    const societyId = currentUserDoc.exists() ? currentUserDoc.data()['societyId'] || currentUser.uid : currentUser.uid;

    const paymentsRef = collection(this.firestore, 'payments');
    const q = query(paymentsRef, where('societyId', '==', societyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Payment));
  }

  /**
   * Get payments by student ID
   */
  async getPaymentsByStudentId(studentId: string): Promise<Payment[]> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    const societyId = currentUserDoc.exists() ? currentUserDoc.data()['societyId'] || currentUser.uid : currentUser.uid;

    const paymentsRef = collection(this.firestore, 'payments');
    const q = query(paymentsRef, where('studentId', '==', studentId), where('societyId', '==', societyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Payment));
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(paymentId: string, status: 'paid' | 'unpaid', notes?: string): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    // verify payment belongs to the same society as the admin
    const paymentRefCheck = await getDoc(doc(this.firestore, 'payments', paymentId));
    if (!paymentRefCheck.exists()) throw new Error('Payment not found');
    const paymentDocData: any = paymentRefCheck.data();
    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    const societyId = currentUserDoc.exists() ? currentUserDoc.data()['societyId'] || currentUser.uid : currentUser.uid;
    if (paymentDocData.societyId && paymentDocData.societyId !== societyId) {
      throw new Error('Permission denied: payment belongs to another society');
    }
    const paymentRef = doc(this.firestore, 'payments', paymentId);
    const updateData: any = {
      status,
      paidBy: currentUser.uid
    };

    if (status === 'paid') {
      updateData.paidAt = new Date().toISOString();
    } else {
      updateData.paidAt = null;
    }

    if (notes) {
      updateData.notes = notes;
    }

    await updateDoc(paymentRef, updateData);
  }

  /**
   * Get complete payment summary for a student (for student portal)
   */
  async getStudentPaymentSummary(studentId: string): Promise<StudentPaymentSummary> {
    // Get student from users collection
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('studentId', '==', studentId));
    const studentSnapshot = await getDocs(q);

    if (studentSnapshot.empty) {
      throw new Error('Student not found');
    }

    const studentData = studentSnapshot.docs[0].data() as User;
    // Fetch payments filtered by the student's society
    const payments = await (async () => {
      const paymentsRef = collection(this.firestore, 'payments');
      const q2 = query(paymentsRef, where('studentId', '==', studentId), where('societyId', '==', studentData.societyId || ''));
      const snapshot = await getDocs(q2);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Payment));
    })();
    const fees = await this.feeService.getAllFees();

    // Calculate totals
    let totalPaid = 0;
    let totalUnpaid = 0;

    payments.forEach(payment => {
      const fee = fees.find(f => f.id === payment.feeId);
      if (fee) {
        if (payment.status === 'paid') {
          totalPaid += fee.amount;
        } else {
          totalUnpaid += fee.amount;
        }
      }
    });

    return {
      studentId,
      email: studentData.email,
      society: studentData.society,
      totalPaid,
      totalUnpaid,
      payments,
      fees
    };
  }

  /**
   * Get outstanding balance report (unpaid fees)
   */
  async getOutstandingBalanceReport(): Promise<StudentPaymentSummary[]> {
    // Only get unpaid payments for current admin's society
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    const societyId = currentUserDoc.exists() ? currentUserDoc.data()['societyId'] || currentUser.uid : currentUser.uid;

    const paymentsRef = collection(this.firestore, 'payments');
    const q = query(paymentsRef, where('status', '==', 'unpaid'), where('societyId', '==', societyId));
    const paymentSnapshot = await getDocs(q);

    if (paymentSnapshot.empty) return [];

    const studentsMap = new Map<string, StudentPaymentSummary>();
    const fees = await this.feeService.getAllFees();

    // Group payments by student
    for (const paymentDoc of paymentSnapshot.docs) {
      const payment = paymentDoc.data() as Payment;
      payment.id = paymentDoc.id;

      if (!studentsMap.has(payment.studentId)) {
        // Get student info from users collection
        const usersRef = collection(this.firestore, 'users');
        const q2 = query(usersRef, where('studentId', '==', payment.studentId), where('societyId', '==', societyId));
        const studentSnapshot = await getDocs(q2);

        if (studentSnapshot.empty) continue;

        const studentData = studentSnapshot.docs[0].data() as User;
        const studentPayments = await this.getPaymentsByStudentId(payment.studentId);

        let totalUnpaid = 0;
        studentPayments.forEach(p => {
          const fee = fees.find(f => f.id === p.feeId);
          if (fee && p.status === 'unpaid') {
            totalUnpaid += fee.amount;
          }
        });

        studentsMap.set(payment.studentId, {
          studentId: payment.studentId,
          email: studentData.email,
          society: studentData.society,
          totalPaid: 0,
          totalUnpaid,
          payments: studentPayments,
          fees
        });
      }
    }

    return Array.from(studentsMap.values());
  }

  /**
   * Subscribe to real-time payment updates
   */
  subscribePayments(callback: (payments: Payment[]) => void): () => void {
    const paymentsRef = collection(this.firestore, 'payments');
    return onSnapshot(paymentsRef, snapshot => {
      const payments = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Payment));
      callback(payments);
    });
  }
}
