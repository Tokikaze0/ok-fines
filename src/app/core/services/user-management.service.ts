import { Injectable } from '@angular/core';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { environment } from '../../../environments/environment';
import { getAuth, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { User, BulkStudentImport, BulkOperationResult } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private app = initializeApp(environment.firebaseConfig);
  private firestore = getFirestore(this.app);
  private auth = getAuth(this.app);

  /**
   * Create a new student user
   * @param email Student email
   * @param password Student password
   * @param studentId Student ID (format: MMC20**-*****)
   * @param society Student's society
   */
  async createStudentUser(email: string, password: string, studentId: string, society: string): Promise<User> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    if (!currentUserDoc.exists()) {
      throw new Error('User document not found');
    }

    const adminData = currentUserDoc.data();
    if (adminData['role'] !== 'admin') {
      throw new Error('Only admin users can create student users');
    }

    // Validate student ID format
    const studentIdRegex = /^MMC20\d{2}-\d{5}$/;
    if (!studentIdRegex.test(studentId)) {
      throw new Error('Invalid student ID format. Must be MMC20**-*****');
    }

    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    const user = cred.user;

    const userData: User = {
      uid: user.uid,
      email: email,
      role: 'student',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.uid,
      studentId: studentId,
      society: society
    };

    const userDocRef = doc(this.firestore, 'users', user.uid);
    await setDoc(userDocRef, userData);
    return userData;
  }

  /**
   * Get all student users
   */
  async getAllStudentUsers(): Promise<User[]> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    if (!currentUserDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = currentUserDoc.data() as User;
    if (userData.role !== 'admin') {
      throw new Error('User is not an admin');
    }

    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('role', '==', 'student'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
  }

  /**
   * Update a student user
   */
  async updateStudentUser(uid: string, data: Partial<User>): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    if (!currentUserDoc.exists()) {
      throw new Error('User document not found');
    }

    const adminData = currentUserDoc.data();
    if (adminData['role'] !== 'admin') {
      throw new Error('Only admin users can update student users');
    }

    const userToUpdate = await getDoc(doc(this.firestore, 'users', uid));
    if (!userToUpdate.exists()) {
      throw new Error('User to update not found');
    }

    const userToUpdateData = userToUpdate.data();
    if (userToUpdateData['role'] !== 'student') {
      throw new Error('Can only update student users');
    }

    // Validate student ID if being updated
    if (data.studentId) {
      const studentIdRegex = /^MMC20\d{2}-\d{5}$/;
      if (!studentIdRegex.test(data.studentId)) {
        throw new Error('Invalid student ID format. Must be MMC20**-*****');
      }
    }

    const userDocRef = doc(this.firestore, 'users', uid);
    await updateDoc(userDocRef, data);

    if (data.email) {
      console.warn('Email updated in Firestore. User must sign in to update their email in Authentication.');
    }
  }

  /**
   * Delete a student user
   */
  async deleteStudentUser(uid: string): Promise<void> {
    const userDocRef = doc(this.firestore, 'users', uid);
    await deleteDoc(userDocRef);

    try {
      const user = this.auth.currentUser;
      if (user && user.uid === uid) {
        await deleteUser(user);
      }
    } catch (error) {
      console.error('Error deleting user from Authentication:', error);
    }
  }

  /**
   * Create multiple students from CSV import
   * @param students Array of student data to import
   */
  async createBulkStudents(students: BulkStudentImport[]): Promise<BulkOperationResult> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    if (!currentUserDoc.exists() || currentUserDoc.data()['role'] !== 'admin') {
      throw new Error('Only admin users can create student users');
    }

    const results: BulkOperationResult = {
      success: [],
      errors: []
    };

    for (const student of students) {
      try {
        await this.createStudentUser(student.email, student.password, student.studentId, student.society);
        results.success.push(student.email);
      } catch (error: any) {
        results.errors.push({
          email: student.email,
          error: error.message || 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Get a single student user by ID
   */
  async getStudentUser(uid: string): Promise<User | null> {
    const userDocRef = doc(this.firestore, 'users', uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
    return null;
  }
}
