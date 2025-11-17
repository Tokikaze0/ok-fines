import { Injectable } from '@angular/core';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  onSnapshot,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { environment } from '../../../environments/environment';
import { Fee, Payment, StudentPaymentSummary } from '../models/fee.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class FeeService {
  private app = initializeApp(environment.firebaseConfig);
  private firestore = getFirestore(this.app);
  private auth = getAuth(this.app);

  /**
   * Add a new fee
   */
  async addFee(description: string, amount: number): Promise<string> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');

    const feeData: Fee = {
      description,
      amount,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.uid
    };

    const docRef = await addDoc(collection(this.firestore, 'fees'), feeData);
    return docRef.id;
  }

  /**
   * Update a fee
   */
  async updateFee(feeId: string, description: string, amount: number): Promise<void> {
    const feeRef = doc(this.firestore, 'fees', feeId);
    await updateDoc(feeRef, { description, amount });
  }

  /**
   * Delete a fee
   */
  async deleteFee(feeId: string): Promise<void> {
    const feeRef = doc(this.firestore, 'fees', feeId);
    await deleteDoc(feeRef);
  }

  /**
   * Get all fees
   */
  async getAllFees(): Promise<Fee[]> {
    const feesRef = collection(this.firestore, 'fees');
    const snapshot = await getDocs(feesRef);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Fee));
  }

  /**
   * Subscribe to real-time fee updates
   */
  subscribeFees(callback: (fees: Fee[]) => void): () => void {
    const feesRef = collection(this.firestore, 'fees');
    return onSnapshot(feesRef, snapshot => {
      const fees = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Fee));
      callback(fees);
    });
  }

  /**
   * Create default payment records for all students when a new fee is added
   */
  async createPaymentsForFee(feeId: string): Promise<void> {
    try {
      const studentsRef = collection(this.firestore, 'users');
      const q = query(studentsRef, where('role', '==', 'student'));
      const studentSnapshot = await getDocs(q);

      if (studentSnapshot.empty) return;

      const batch = writeBatch(this.firestore);
      const paymentsRef = collection(this.firestore, 'payments');

      studentSnapshot.docs.forEach(studentDoc => {
        const studentData = studentDoc.data() as User;
        const paymentData: Payment = {
          studentId: studentData.studentId || studentData.uid,
          feeId,
          status: 'unpaid',
          createdAt: new Date().toISOString()
        };

        const newPaymentRef = doc(collection(this.firestore, 'payments'));
        batch.set(newPaymentRef, paymentData);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error creating payments for fee:', error);
    }
  }
}
