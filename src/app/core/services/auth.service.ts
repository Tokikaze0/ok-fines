import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { Router } from '@angular/router';

/**
 * Authentication Service
 * Handles user login, registration, and session management
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private app = initializeApp(environment.firebaseConfig);
  public auth = getAuth(this.app);
  private firestore = getFirestore(this.app);

  constructor(private storage: StorageService, private router: Router) {}

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    const user = cred.user;
    const token = await user.getIdToken();

    // Get user role from Firestore
    const userDocRef = doc(this.firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }

    const userData = userDoc.data();
    const role = userData['role'];

    // Store token and role
    await this.storage.set('access_token', token);
    await this.storage.set('user_role', role);

    // Navigate based on role
    if (role === 'homeroom') {
      this.router.navigate(['/homeroom-dashboard']);
    } else if (role === 'student') {
      this.router.navigate(['/student-dashboard']);
    } else if (role === 'admin') {
      this.router.navigate(['/dashboard']);
    } else {
      throw new Error('Invalid user role');
    }
  }

  /**
   * Register new admin user
   */
  async register(email: string, password: string, societyId: string): Promise<void> {
    // Ensure societyId is provided
    if (!societyId) {
      throw new Error('Missing societyId');
    }

    // Check that no other admin exists for this societyId
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('role', '==', 'admin'), where('societyId', '==', societyId));
    const existing = await getDocs(q);
    if (!existing.empty) {
      const e: any = new Error('An admin for this society already exists');
      e.code = 'society/admin_exists';
      throw e;
    }

    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    const user = cred.user;
    const token = await user.getIdToken();

    // Save user data in Firestore - always as admin and set societyId
    const userDocRef = doc(this.firestore, 'users', user.uid);
    await setDoc(userDocRef, {
      email: email,
      role: 'admin',
      uid: user.uid,
      createdAt: new Date().toISOString(),
      societyId: societyId
    });

    await this.storage.set('access_token', token);
    await this.storage.set('user_role', 'admin');

    // Navigate to admin dashboard
    this.router.navigate(['/dashboard']);
  }

  /**
   * Sign in using Google provider
   */
  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(this.auth, provider);
    const user = cred.user;
    const token = await user.getIdToken();

    // Save or merge user data in Firestore
    const userDocRef = doc(this.firestore, 'users', user.uid);
    await setDoc(userDocRef, {
      email: user.email || null,
      role: 'admin',
      uid: user.uid,
      provider: 'google',
      lastLogin: new Date().toISOString(),
      // Default societyId to user uid to avoid collisions; admin may change later
      societyId: user.uid
    }, { merge: true });

    await this.storage.set('access_token', token);
  }

  /**
   * Get authentication token
   */
  async getToken(): Promise<string | null> {
    return this.storage.get('access_token');
  }

  /**
   * Get user role
   */
  async getUserRole(): Promise<string | null> {
    return this.storage.get('user_role');
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await this.auth.signOut();
    } catch (e) {
      // Ignore sign out errors
    }
    await this.storage.remove('access_token');
    await this.storage.remove('user_role');
    await this.router.navigate(['/login']).catch(() => this.router.navigate(['/']));
  }
}
