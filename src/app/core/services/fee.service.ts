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

    // get admin's societyId from users doc
    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    const societyId = currentUserDoc.exists() ? currentUserDoc.data()['societyId'] || currentUser.uid : currentUser.uid;

    const feeData: Fee = {
      description,
      amount,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.uid,
      societyId
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
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    const societyId = currentUserDoc.exists() ? currentUserDoc.data()['societyId'] || currentUser.uid : currentUser.uid;

    const feesRef = collection(this.firestore, 'fees');
    const q = query(feesRef, where('societyId', '==', societyId));
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
    // subscribe only to fees in the admin's society
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    // create a listener promise (can't await in this sync function), so use onSnapshot on a query
    // obtain societyId synchronously by reading user doc first
    let societyId = currentUser.uid;
    getDoc(doc(this.firestore, 'users', currentUser.uid)).then(userDoc => {
      societyId = userDoc.exists() ? userDoc.data()['societyId'] || currentUser.uid : currentUser.uid;
    }).finally(() => {
      const feesRef = collection(this.firestore, 'fees');
      const q = query(feesRef, where('societyId', '==', societyId));
      onSnapshot(q, snapshot => {
        const fees = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as Fee));
        callback(fees);
      });
    });
    // Return a noop unsubscribe - real unsubscribe requires capturing the listener, but caller can re-subscribe via getAllFees
    return () => { /* listener unsubscribed by GC in this simple impl */ };
  }

  /**
   * Create default payment records for all students when a new fee is added
   */
  async createPaymentsForFee(feeId: string): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');
      const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
      const societyId = currentUserDoc.exists() ? currentUserDoc.data()['societyId'] || currentUser.uid : currentUser.uid;

      const studentsRef = collection(this.firestore, 'users');
      const q = query(studentsRef, where('role', '==', 'student'), where('societyId', '==', societyId));
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
          createdAt: new Date().toISOString(),
          societyId: studentData.societyId || societyId
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
