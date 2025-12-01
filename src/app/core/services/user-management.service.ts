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

  // Secondary app for creating users without logging out the admin
  private secondaryApp = initializeApp(environment.firebaseConfig, 'SecondaryApp');
  private secondaryAuth = getAuth(this.secondaryApp);

  // Normalize student ID formats and pad numeric part to 5 digits when appropriate.
  // Examples:
  //  - "MMC2025 - 00101" -> "MMC2025-00101"
  //  - "MMC2021-0653" -> "MMC2021-00653"
  private normalizeStudentId(raw: string): string | null {
    if (!raw || typeof raw !== 'string') return null;
    let s = raw.trim().toUpperCase();
    s = s.replace(/\s*-\s*/g, '-');
    s = s.replace(/\s+/g, '');

    if (/^C\d+-\d+$/.test(s)) return s;
    const m = s.match(/^MMC(\d{4})-(\d{4,5})$/);
    if (m) {
      const year = m[1];
      let num = m[2];
      if (num.length === 4) num = '0' + num;
      return `MMC${year}-${num}`;
    }
    if (/^MMC\d{4}-\d{4}$/.test(s)) return s;
    return null;
  }

  /**
   * Create a new student user
   * @param email Student email
   * @param password Student password
   * @param studentId Student ID (format: MMC20**-*****)
   * @param society Student's society
   */
  async createStudentUser(email: string, password: string, studentId: string, society: any): Promise<User> {
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

    // Accept extra fields for single registration
    // (Assume extra fields are passed as an object in 'society' param if needed)
    let extraFields: any = {};
    if (typeof society === 'object' && society !== null) {
      extraFields = society;
      society = extraFields.society || '';
    }

    // Normalize & validate student ID
    const normalized = this.normalizeStudentId(studentId);
    if (!normalized) {
      throw new Error('Invalid student ID format. Supported examples: MMC2021-00653, MMC2024-00531, C12-34');
    }
    studentId = normalized;

    // Use secondaryAuth to create user so the admin stays logged in
    const cred = await createUserWithEmailAndPassword(this.secondaryAuth, email, password);
    const user = cred.user;

    // Sign out the secondary user immediately to clean up
    await this.secondaryAuth.signOut();

    const societyId = adminData['societyId'] || currentUser.uid;
    const userData: User = {
      uid: user.uid,
      email: email,
      role: 'student',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.uid,
      studentId: studentId,
      society: society,
      societyId,
      ...extraFields
    };

    const userDocRef = doc(this.firestore, 'users', user.uid);
    await setDoc(userDocRef, userData);

    // Also save to students collection
    const studentDocRef = doc(this.firestore, 'students', studentId);
    await setDoc(studentDocRef, {
      studentId,
      email,
      society,
      createdAt: userData.createdAt,
      createdBy: userData.createdBy,
      societyId,
      ...extraFields
    });
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

    const societyId = userData.societyId || currentUser.uid;
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('role', '==', 'student'), where('societyId', '==', societyId));
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

    // Validate and normalize student ID if being updated
    if (data.studentId) {
      const normalizedUpdate = this.normalizeStudentId(data.studentId as string);
      if (!normalizedUpdate) {
        throw new Error('Invalid student ID format. Must be MMC202*-00*** or C##-##');
      }
      data.studentId = normalizedUpdate;
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

    const societyId = currentUserDoc.data()['societyId'] || currentUser.uid;
    for (const student of students) {
      try {
        await this.createStudentUser(student.email, student.password, student.studentId, {
          ...student,
          societyId
        });
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
   * Create students in the `students` collection (Firestore data only, no Firebase Auth)
   * Useful for bulk import of student data without creating authentication accounts
   */
  async createBulkStudentsToCollection(students: BulkStudentImport[]): Promise<BulkOperationResult> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    if (!currentUserDoc.exists() || currentUserDoc.data()['role'] !== 'admin') {
      throw new Error('Only admin users can create students');
    }

    const results: BulkOperationResult = {
      success: [],
      errors: []
    };

    const societyId = currentUserDoc.data()['societyId'] || currentUser.uid;
    for (const student of students) {
      try {
        // Accept all extra fields from student object, no email/password
        // Normalize studentId coming from import
        const normalized = this.normalizeStudentId(student.studentId || '');
        if (!normalized) throw new Error('Invalid student ID: ' + (student.studentId || ''));
        student.studentId = normalized;
        const studentData = {
          studentId: student.studentId,
          society: student.society || '',
          createdAt: new Date().toISOString(),
          createdBy: currentUser.uid,
          lastName: student.lastName || '',
          firstName: student.firstName || '',
          middleName: student.middleName || '',
          programId: student.programId || '',
          collegeId: student.collegeId || '',
          yearLevelId: student.yearLevelId || '',
          sectionId: student.sectionId || '',
          societyId
        };

        const studentDocRef = doc(this.firestore, 'students', student.studentId);
        await setDoc(studentDocRef, studentData);
        results.success.push(student.studentId);
      } catch (error: any) {
        results.errors.push({
          email: student.studentId, // Use studentId as identifier for error reporting
          error: error.message || 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Update a student in the collection
   */
  async updateStudentInCollection(studentId: string, data: any): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No authenticated user found');

    const studentDocRef = doc(this.firestore, 'students', studentId);
    await updateDoc(studentDocRef, data);
  }

  /**
   * Delete a student from the collection
   */
  async deleteStudentFromCollection(studentId: string): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No authenticated user found');

    const studentDocRef = doc(this.firestore, 'students', studentId);
    await deleteDoc(studentDocRef);
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

  /**
   * Create a new homeroom user
   */
  async createHomeroomUser(email: string, password: string, studentId: string, society: any): Promise<User> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No authenticated user found');

    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    if (!currentUserDoc.exists() || currentUserDoc.data()['role'] !== 'admin') {
      throw new Error('Only admin users can create homeroom users');
    }

    let extraFields: any = {};
    if (typeof society === 'object' && society !== null) {
      extraFields = society;
      society = extraFields.society || '';
    }

    const normalized = this.normalizeStudentId(studentId);
    if (!normalized) throw new Error('Invalid student ID format');
    studentId = normalized;

    // Use secondaryAuth to create user so the admin stays logged in
    const cred = await createUserWithEmailAndPassword(this.secondaryAuth, email, password);
    const user = cred.user;

    // Sign out the secondary user immediately to clean up
    await this.secondaryAuth.signOut();

    const societyId = currentUserDoc.data()['societyId'] || currentUser.uid;
    const userData: User = {
      uid: user.uid,
      email: email,
      role: 'homeroom',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.uid,
      studentId: studentId,
      society: society,
      societyId,
      ...extraFields
    };

    const userDocRef = doc(this.firestore, 'users', user.uid);
    await setDoc(userDocRef, userData);

    return userData;
  }

  /**
   * Update user role
   */
  async updateUserRole(uid: string, newRole: 'student' | 'homeroom'): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No authenticated user found');

    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    if (!currentUserDoc.exists() || currentUserDoc.data()['role'] !== 'admin') {
      throw new Error('Only admin users can update roles');
    }

    const userDocRef = doc(this.firestore, 'users', uid);
    await updateDoc(userDocRef, { role: newRole });
  }

  /**
   * Get all users in society (students and homeroom)
   */
  async getAllUsersInSociety(): Promise<User[]> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No authenticated user found');

    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    if (!currentUserDoc.exists()) throw new Error('User document not found');

    const societyId = currentUserDoc.data()['societyId'] || currentUser.uid;
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('societyId', '==', societyId));
    const querySnapshot = await getDocs(q);
    
    // Filter out the admin themselves if needed, or just return all
    return querySnapshot.docs
      .map(doc => ({ ...doc.data(), uid: doc.id } as User))
      .filter(u => u.role !== 'admin');
  }

  /**
   * Get all students from the `students` collection (not Auth users)
   */
  async getAllStudentsFromCollection(): Promise<any[]> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    if (!currentUserDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = currentUserDoc.data() as any;
    if (userData.role !== 'admin') {
      throw new Error('User is not an admin');
    }

    const societyId = userData.societyId || currentUser.uid;
    const studentsRef = collection(this.firestore, 'students');
    const q = query(studentsRef, where('societyId', '==', societyId));
    const querySnapshot = await getDocs(q);

    const students: any[] = querySnapshot.docs.map(d => {
      const data = d.data();
      const lastName = data['lastName'] || '';
      const firstName = data['firstName'] || '';
      const middleName = data['middleName'] || '';
      return {
        id: d.id,
        ...data,
        fullName: `${lastName}${lastName ? ', ' : ''}${firstName}${middleName ? ' ' + middleName : ''}`.trim()
      } as any;
    });

    // sort by lastName then firstName
    students.sort((a: any, b: any) => {
      const la = ((a.lastName || '') as string).toString().toLowerCase();
      const lb = ((b.lastName || '') as string).toString().toLowerCase();
      if (la < lb) return -1;
      if (la > lb) return 1;
      const fa = ((a.firstName || '') as string).toString().toLowerCase();
      const fb = ((b.firstName || '') as string).toString().toLowerCase();
      if (fa < fb) return -1;
      if (fa > fb) return 1;
      return 0;
    });

    return students;
  }
}
