import { Injectable } from '@angular/core';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { environment } from '../../environments/environment';
import { getAuth, createUserWithEmailAndPassword, deleteUser, signInWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export interface User {
    uid: string;
    email: string;
    role: string;
    createdAt: string;
    createdBy?: string; // UID of the admin who created this user
    studentId?: string; // Format: MMC20**-*****
    society?: string;
}@Injectable({
    providedIn: 'root'
})
export class UserManagementService {
    private app = initializeApp(environment.firebaseConfig);
    private firestore = getFirestore(this.app);
    private auth = getAuth(this.app);

    async createHomeroomUser(email: string, password: string): Promise<User> {
        // First verify if current user is admin
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
      throw new Error('Only admin users can create homeroom users');
    }        // Create the new user account
        const cred = await createUserWithEmailAndPassword(this.auth, email, password);
        const user = cred.user;

        const userData: User = {
            uid: user.uid,
            email: email,
            role: 'homeroom',
            createdAt: new Date().toISOString(),
            createdBy: currentUser.uid // Store the admin's UID
        };

        const userDocRef = doc(this.firestore, 'users', user.uid);
        await setDoc(userDocRef, userData);

        return userData;
    }

    async getAllHomeroomUsers(): Promise<User[]> {
        // First verify if current user is admin
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

        // If we get here, user is an admin, proceed with query
        const usersRef = collection(this.firestore, 'users');
        const q = query(usersRef, where('role', '==', 'homeroom'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
    }

    async updateHomeroomUser(uid: string, data: Partial<User>): Promise<void> {
        // First verify if current user is admin
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
            throw new Error('Only admin users can update homeroom users');
        }

        // Get the user we want to update
        const userToUpdate = await getDoc(doc(this.firestore, 'users', uid));
        if (!userToUpdate.exists()) {
            throw new Error('User to update not found');
        }

        const userToUpdateData = userToUpdate.data();
        if (userToUpdateData['role'] !== 'homeroom') {
            throw new Error('Can only update homeroom users');
        }

        // Update in Firestore first
        const userDocRef = doc(this.firestore, 'users', uid);
        await updateDoc(userDocRef, data);

        // If email is being updated, notify that a separate process is needed
        if (data.email) {
            console.warn('Email updated in Firestore. User must sign in to update their email in Authentication.');
        }
    }

    async deleteHomeroomUser(uid: string): Promise<void> {
        const userDocRef = doc(this.firestore, 'users', uid);
        await deleteDoc(userDocRef);

        // If the user exists in Authentication, delete them there as well
        try {
            const user = this.auth.currentUser;
            if (user && user.uid === uid) {
                await deleteUser(user);
            }
        } catch (error) {
            console.error('Error deleting user from Authentication:', error);
        }
    }

    async getHomeroomUser(uid: string): Promise<User | null> {
        const userDocRef = doc(this.firestore, 'users', uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            return docSnap.data() as User;
        }
        return null;
    }

    // STUDENT USER MANAGEMENT
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
        const userDocRef = doc(this.firestore, 'users', uid);
        await updateDoc(userDocRef, data);
        if (data.email) {
            console.warn('Email updated in Firestore. User must sign in to update their email in Authentication.');
        }
    }

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

    // Bulk student creation from CSV
    async createBulkStudents(students: { email: string; password: string; studentId: string; society: string }[]): Promise<{ success: string[]; errors: { email: string; error: string }[] }> {
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            throw new Error('No authenticated user found');
        }

        const currentUserDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
        if (!currentUserDoc.exists() || currentUserDoc.data()['role'] !== 'admin') {
            throw new Error('Only admin users can create student users');
        }

        const results = {
            success: [] as string[],
            errors: [] as { email: string; error: string }[]
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
}