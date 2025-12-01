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
  Query,
  CollectionReference,
  DocumentData
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { environment } from '../../../environments/environment';
import { Payment, StudentPaymentSummary } from '../models/fee.model';
import { User } from '../models/user.model';
import { FeeService } from './fee.service';

// Lightweight logger interface for telemetry
interface Logger {
  info(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private app = initializeApp(environment.firebaseConfig);
  private firestore = getFirestore(this.app);
  private auth = getAuth(this.app);

  // Centralized collection names
  private readonly COLLECTIONS = { users: 'users', payments: 'payments' } as const;

  // Basic console logger (can be swapped with a proper LoggerService later)
  private logger: Logger = {
    info: (m: string, d?: unknown) => console.log(`[PaymentService] ${m}`, d ?? ''),
    error: (m: string, d?: unknown) => console.error(`[PaymentService] ${m}`, d ?? '')
  };

  constructor(private feeService: FeeService) {}

  /**
   * Get all payments
   */
  async getAllPayments(): Promise<Payment[]> {
    try {
      const societyId = await this.getCurrentUserSocietyIdOrThrow();

      const paymentsRef = collection(this.firestore, this.COLLECTIONS.payments) as CollectionReference<DocumentData>;
      const qRef = query(paymentsRef, where('societyId', '==', societyId));
      const snapshot = await this.runWithRetry(() => getDocs(qRef));
      return snapshot.docs.map(d => ({ ...(d.data() as Payment), id: d.id }));
    } catch (err) {
      this.logger.error('Failed to fetch all payments', err);
      throw this.humanizeError(err, 'Unable to load payments');
    }
  }

  /**
   * Get payments by student ID
   */
  async getPaymentsByStudentId(studentId: string): Promise<Payment[]> {
    try {
      const societyId = await this.getCurrentUserSocietyIdOrThrow();

      const paymentsRef = collection(this.firestore, this.COLLECTIONS.payments) as CollectionReference<DocumentData>;
      const qRef = query(paymentsRef, where('studentId', '==', studentId), where('societyId', '==', societyId));
      const snapshot = await this.runWithRetry(() => getDocs(qRef));
      return snapshot.docs.map(d => ({ ...(d.data() as Payment), id: d.id }));
    } catch (err) {
      this.logger.error('Failed to fetch payments by student', { studentId, err });
      throw this.humanizeError(err, 'Unable to load student payments');
    }
  }

  /**
   * Get payments by fee ID
   */
  async getPaymentsByFee(feeId: string): Promise<Payment[]> {
    try {
      const societyId = await this.getCurrentUserSocietyIdOrThrow();

      const paymentsRef = collection(this.firestore, this.COLLECTIONS.payments) as CollectionReference<DocumentData>;
      const qRef = query(paymentsRef, where('feeId', '==', feeId), where('societyId', '==', societyId));
      const snapshot = await this.runWithRetry(() => getDocs(qRef));
      return snapshot.docs.map(d => ({ ...(d.data() as Payment), id: d.id }));
    } catch (err) {
      this.logger.error('Failed to fetch payments by fee', { feeId, err });
      throw this.humanizeError(err, 'Unable to load fee payments');
    }
  }

  /**
   * Update payment status with optional idempotency key to avoid duplicate processing
   */
  async updatePaymentStatus(paymentId: string, status: 'paid' | 'unpaid' | 'pending', notes?: string, idempotencyKey?: string): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      // verify payment belongs to the same society as the admin
      const paymentRefCheck = await getDoc(doc(this.firestore, this.COLLECTIONS.payments, paymentId));
      if (!paymentRefCheck.exists()) throw new Error('Payment not found');
      const paymentDocData: any = paymentRefCheck.data();

      const societyId = await this.getCurrentUserSocietyIdOrThrow();
      if (paymentDocData.societyId && paymentDocData.societyId !== societyId) {
        throw new Error('Permission denied: payment belongs to another society');
      }

      const paymentRef = doc(this.firestore, this.COLLECTIONS.payments, paymentId);
      const updateData: any = {
        status,
        paidBy: currentUser.uid
      };

      // Idempotency: if the same key is used and nothing changed, avoid duplicate action
      if (idempotencyKey && paymentDocData.idempotencyKey === idempotencyKey && paymentDocData.status === status) {
        this.logger.info('Idempotent update skipped', { paymentId, status });
        return;
      }

      if (status === 'paid') {
        updateData.paidAt = new Date().toISOString();
      } else if (status === 'pending') {
        updateData.paidAt = null; // Pending is not fully paid yet
      } else {
        updateData.paidAt = null;
      }

      if (notes) {
        updateData.notes = notes;
      }

      if (idempotencyKey) {
        (updateData as any).idempotencyKey = idempotencyKey;
      }

      await updateDoc(paymentRef, updateData as any);
      this.logger.info('Payment status updated', { paymentId, status });
    } catch (err) {
      this.logger.error('Failed to update payment status', { paymentId, status, err });
      throw this.humanizeError(err, 'Unable to update payment');
    }
  }

  /**
   * Create a payment record (if it doesn't exist)
   */
  async createPayment(payment: Payment): Promise<string> {
    try {
      const societyId = await this.getCurrentUserSocietyIdOrThrow();
      const paymentsRef = collection(this.firestore, this.COLLECTIONS.payments);
      
      // Check if payment already exists
      const q = query(
        paymentsRef, 
        where('studentId', '==', payment.studentId), 
        where('feeId', '==', payment.feeId),
        where('societyId', '==', societyId)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }

      const docRef = await import('firebase/firestore').then(m => m.addDoc(paymentsRef, {
        ...payment,
        societyId,
        createdAt: new Date().toISOString()
      }));
      
      return docRef.id;
    } catch (err) {
      this.logger.error('Failed to create payment', err);
      throw this.humanizeError(err, 'Unable to create payment');
    }
  }

  /**
   * Get complete payment summary for a student (for student portal)
   */
  async getStudentPaymentSummary(studentId: string): Promise<StudentPaymentSummary> {
    try {
      // First try the `students` collection (bulk-imported student records)
      let studentData: any = null;
      const studentsDocRef = doc(this.firestore, 'students', studentId);
      const studentDoc = await getDoc(studentsDocRef);
      if (studentDoc.exists()) {
        studentData = studentDoc.data() as any;
      } else {
        // Fallback to users collection (auth users) lookup
        const usersRef = collection(this.firestore, this.COLLECTIONS.users) as CollectionReference<DocumentData>;
        const qRef = query(usersRef, where('studentId', '==', studentId));
        const studentSnapshot = await this.runWithRetry(() => getDocs(qRef));

        if (studentSnapshot.empty) {
          throw new Error('Student not found');
        }

        studentData = studentSnapshot.docs[0].data() as User;
      }
      // Fetch payments filtered by the student's society
      const allPayments = await (async () => {
        const paymentsRef = collection(this.firestore, this.COLLECTIONS.payments) as CollectionReference<DocumentData>;
        const q2 = query(paymentsRef, where('studentId', '==', studentId), where('societyId', '==', (studentData as any).societyId || ''));
        const snapshot = await this.runWithRetry(() => getDocs(q2));
        return snapshot.docs.map(d => ({ ...(d.data() as Payment), id: d.id }));
      })();
      const fees = await this.feeService.getAllFees((studentData as any).societyId || '');

      const studentYearLevel = String((studentData as any).yearLevelId || '');
      const studentSection = String((studentData as any).sectionId || '');

      // Filter payments based on fee targeting
      // We only show payments that are:
      // 1. Paid (always show history)
      // 2. Unpaid/Pending AND the fee targets match the student
      const payments = allPayments.filter(payment => {
        const fee = fees.find(f => f.id === payment.feeId);
        if (!fee) return false;

        // If already paid, keep it
        if (payment.status === 'paid') return true;

        // Check targeting for unpaid/pending
        if (fee.targetYearLevel && String(fee.targetYearLevel) !== studentYearLevel) return false;
        if (fee.targetSection && String(fee.targetSection) !== studentSection) return false;

        return true;
      });

      // Calculate totals
      let totalPaid = 0;
      let totalUnpaid = 0;

      payments.forEach((payment: Payment) => {
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
        email: (studentData as any).email,
        society: (studentData as any).society,
        totalPaid,
        totalUnpaid,
        payments,
        fees
      };
    } catch (err) {
      this.logger.error('Failed to get student payment summary', { studentId, err });
      throw this.humanizeError(err, 'Unable to load student summary');
    }
  }

  /**
   * Get outstanding balance report (unpaid fees)
   */
  async getOutstandingBalanceReport(): Promise<StudentPaymentSummary[]> {
    try {
      // Only get unpaid payments for current admin's society
      const societyId = await this.getCurrentUserSocietyIdOrThrow();

      // 1. Get all fees
      const fees = await this.feeService.getAllFees(societyId);
      if (fees.length === 0) return [];

      // 2. Get all students (from 'students' collection)
      const studentsRef = collection(this.firestore, 'students');
      const qStudents = query(studentsRef, where('societyId', '==', societyId));
      const studentSnapshot = await this.runWithRetry(() => getDocs(qStudents));
      
      if (studentSnapshot.empty) return [];

      const students = studentSnapshot.docs.map(doc => doc.data() as User);

      // 3. Get all payments
      const paymentsRef = collection(this.firestore, this.COLLECTIONS.payments);
      const qPayments = query(paymentsRef, where('societyId', '==', societyId));
      const paymentSnapshot = await this.runWithRetry(() => getDocs(qPayments));
      
      const payments = paymentSnapshot.docs.map(doc => {
          const data = doc.data() as Payment;
          data.id = doc.id;
          return data;
      });

      const report: StudentPaymentSummary[] = [];

      // 4. Calculate balance for each student
      for (const student of students) {
        if (!student.studentId) continue;

        const studentPayments = payments.filter(p => p.studentId === student.studentId);
        let totalUnpaid = 0;
        let totalPaid = 0;
        const relevantPayments: Payment[] = [];

        for (const fee of fees) {
            // Check targeting
            if (fee.targetYearLevel && String(student.yearLevelId) !== String(fee.targetYearLevel)) continue;
            if (fee.targetSection && String(student.sectionId) !== String(fee.targetSection)) continue;

            const payment = studentPayments.find(p => p.feeId === fee.id);
            const isPaid = payment && payment.status === 'paid';

            if (isPaid) {
                totalPaid += fee.amount;
                relevantPayments.push(payment!);
            } else {
                totalUnpaid += fee.amount;
                // Create a virtual "unpaid" payment record for the report if one doesn't exist
                relevantPayments.push(payment || {
                    studentId: student.studentId!,
                    feeId: fee.id!,
                    status: 'unpaid',
                    createdAt: new Date().toISOString(),
                    societyId: societyId
                });
            }
        }

        if (totalUnpaid > 0) {
            const fullName = student.fullName || (student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : undefined);
            report.push({
                studentId: student.studentId!,
                fullName: fullName,
                email: student.email || '',
                society: student.society || '',
                totalPaid,
                totalUnpaid,
                payments: relevantPayments,
                fees: fees
            });
        }
      }

      return report;
    } catch (err) {
      this.logger.error('Failed to get outstanding balance report', err);
      throw this.humanizeError(err, 'Unable to load outstanding report');
    }
  }

  /**
   * Subscribe to real-time payment updates; filters by current user's society when available.
   * Returns a function to unsubscribe. Caller should always call the returned function in ngOnDestroy.
   */
  subscribePayments(callback: (payments: Payment[]) => void): () => void {
    const paymentsRef = collection(this.firestore, this.COLLECTIONS.payments) as CollectionReference<DocumentData>;

    // Start with a broad subscription as a fallback; replace with filtered once society is resolved.
    let activeUnsub = onSnapshot(paymentsRef, snapshot => {
      const payments = snapshot.docs.map(d => ({ ...(d.data() as Payment), id: d.id }));
      callback(payments);
    });

    const currentUser = this.auth.currentUser;
    if (currentUser) {
      getDoc(doc(this.firestore, this.COLLECTIONS.users, currentUser.uid))
        .then(currentUserDoc => {
          const societyId = currentUserDoc.exists() ? (currentUserDoc.data() as any)['societyId'] || currentUser.uid : currentUser.uid;
          const qRef = query(paymentsRef, where('societyId', '==', societyId));
          const newUnsub = onSnapshot(qRef, snapshot => {
            const payments = snapshot.docs.map(d => ({ ...(d.data() as Payment), id: d.id }));
            callback(payments);
          });
          // Switch to filtered subscription
          activeUnsub();
          activeUnsub = newUnsub;
        })
        .catch(err => {
          this.logger.error('Failed to setup payment subscription; using broad subscription', err);
        });
    }

    return () => {
      try {
        activeUnsub();
      } catch {}
    };
  }

  // Helpers
  private async getCurrentUserSocietyIdOrThrow(): Promise<string> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const currentUserDoc = await getDoc(doc(this.firestore, this.COLLECTIONS.users, currentUser.uid));
    return currentUserDoc.exists() ? (currentUserDoc.data() as any)['societyId'] || currentUser.uid : currentUser.uid;
  }

  // Simple retry helper for idempotent reads (e.g., getDocs)
  private async runWithRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 250): Promise<T> {
    let lastErr: any;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const delay = baseDelayMs * Math.pow(2, i) + Math.floor(Math.random() * 50);
        await new Promise(res => setTimeout(res, delay));
      }
    }
    throw lastErr;
  }

  // Map low-level errors to user-friendly error messages
  private humanizeError(err: any, fallback: string): Error {
    if (err instanceof Error) {
      return new Error(err.message || fallback);
    }
    if (typeof err === 'string') {
      return new Error(err);
    }
    return new Error(fallback);
  }
}
