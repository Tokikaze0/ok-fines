import { Injectable } from '@angular/core';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
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

    // Fee applicable to all students (no society scoping)
    // Attach the admin's societyId if available so student portal can query fees by society
    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    const societyId = currentUserDoc.exists() ? (currentUserDoc.data() as any)['societyId'] : undefined;

    const feeData: Fee = {
      description,
      amount,
      createdAt: new Date().toISOString(),
      createdBy: currentUser!.uid,
      societyId: societyId
    } as Fee;

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
   * Check whether the current user has permission to delete the fee.
   * Throws an Error with a helpful message when not allowed.
   */
  async ensureCanDeleteFee(feeId: string): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');

    const userDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    if (!userDoc.exists()) throw new Error('User profile not found; cannot verify permissions');
    const userData: any = userDoc.data();
    if (userData.role !== 'admin') throw new Error('Permission denied: only admins can delete fees');

    const feeDoc = await getDoc(doc(this.firestore, 'fees', feeId));
    if (!feeDoc.exists()) throw new Error('Fee not found');
    const feeData: any = feeDoc.data();

    if (feeData.createdBy !== currentUser.uid) throw new Error('Permission denied: only the creating admin can delete this fee');
    const userSoc = userData.societyId || null;
    const feeSoc = feeData.societyId || null;
    if (userSoc && feeSoc && userSoc !== feeSoc) throw new Error('Permission denied: fee belongs to a different society');
  }

  /**
   * Get all fees
   */
  /**
   * Get all fees. If `societyId` is provided, returns fees for that society.
   * Otherwise returns fees created by the current user (admin view).
   */
  async getAllFees(societyId?: string): Promise<Fee[]> {
    const currentUser = this.auth.currentUser;
    if (!currentUser && !societyId) throw new Error('User not authenticated');

    const feesRef = collection(this.firestore, 'fees');
    let q;
    if (societyId) {
      q = query(feesRef, where('societyId', '==', societyId));
    } else {
      q = query(feesRef, where('createdBy', '==', currentUser!.uid));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Fee));
  }

  /**
   * Subscribe to real-time fee updates
   */
  subscribeFees(callback: (fees: Fee[]) => void): () => void {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const feesRef = collection(this.firestore, 'fees');
    const q = query(feesRef, where('createdBy', '==', currentUser.uid));
    const unsub = onSnapshot(q, snapshot => {
      const fees = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Fee));
      callback(fees);
    });
    return unsub;
  }

  /**
   * Create default payment records for all students when a new fee is added
   */
  async createPaymentsForFee(feeId: string, studentIds?: string[]): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');
      const batch = writeBatch(this.firestore);

      // Determine creating admin's societyId to use as default when student records lack one
      const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
      const adminSocietyId = currentUserDoc.exists() ? (currentUserDoc.data() as any)['societyId'] : undefined;

      if (studentIds && studentIds.length > 0) {
        // Create payments only for selected student IDs using `students` collection
        for (const sid of studentIds) {
          const studentDoc = await getDoc(doc(this.firestore, 'students', sid));
          if (!studentDoc.exists()) continue;
          const sd: any = studentDoc.data();
          const paymentData: Payment = {
            studentId: sd.studentId || sid,
            feeId,
            status: 'unpaid',
            createdAt: new Date().toISOString(),
            societyId: sd.societyId || adminSocietyId || null
          } as Payment;
          const newPaymentRef = doc(collection(this.firestore, 'payments'));
          batch.set(newPaymentRef, paymentData);
        }
      } else {
        // Fallback: create payments for all student auth users (existing behavior)
        const studentsRef = collection(this.firestore, 'users');
        const q = query(studentsRef, where('role', '==', 'student'));
        const studentSnapshot = await getDocs(q);
        if (studentSnapshot.empty) return;
        studentSnapshot.docs.forEach(studentDoc => {
          const studentData = studentDoc.data() as any;
          const paymentData: Payment = {
            studentId: (studentData.studentId || studentData.uid) as string,
            feeId,
            status: 'unpaid',
            createdAt: new Date().toISOString(),
            societyId: studentData.societyId || adminSocietyId || null
          } as Payment;
          const newPaymentRef = doc(collection(this.firestore, 'payments'));
          batch.set(newPaymentRef, paymentData);
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error creating payments for fee:', error);
    }
  }
}
