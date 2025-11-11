import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private app = initializeApp(environment.firebaseConfig);
  private auth = getAuth(this.app);
  private firestore = getFirestore(this.app);

  constructor(private storage: StorageService, private router: Router) {}

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

  async register(email: string, password: string): Promise<void> {
    // Create a Firebase user and store the ID token similarly to login
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    const user = cred.user;
    const token = await user.getIdToken();
    
    // Save user data in Firestore - always as admin
    const userDocRef = doc(this.firestore, 'users', user.uid);
    await setDoc(userDocRef, {
      email: email,
      role: 'admin',
      uid: user.uid,
      createdAt: new Date().toISOString()
    });
    
    await this.storage.set('access_token', token);
    await this.storage.set('user_role', 'admin');
    
    // Navigate to admin dashboard
    this.router.navigate(['/dashboard']);
  }

  /**
   * Sign in using Google provider (web popup flow).
   * Creates/updates a user document in Firestore and stores ID token.
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
      lastLogin: new Date().toISOString()
    }, { merge: true });

    await this.storage.set('access_token', token);
  }

  async getToken(): Promise<string | null> {
    return this.storage.get('access_token');
  }

  async logout(): Promise<void> {
    try {
      await this.auth.signOut();
    } catch {}
    await this.storage.remove('access_token');
    await this.router.navigate(['/login']).catch(() => this.router.navigate(['/']));
  }
}
