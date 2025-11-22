import { Component } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
    selector: 'app-register',
    templateUrl: './register.page.html',
    styleUrls: ['./register.page.scss'],
    standalone: false,
})
export class RegisterPage {
    email = '';
    password = '';
    confirm = '';
    societyId = '';
    loading = false;
    showPassword = false;
    showConfirm = false;

    constructor(
        private auth: AuthService,
        private router: Router,
        private toastCtrl: ToastController,
        private loadingCtrl: LoadingController
    ) { }

    private async showToast(message: string, duration = 3000) {
        const t = await this.toastCtrl.create({ message, duration });
        await t.present();
    }

    async register() {
        if (!this.email || !this.password) {
            this.showToast('Please provide email and password');
            return;
        }
        // Validate societyId presence and format
        if (!this.societyId) {
            this.showToast('Please provide a Society ID');
            return;
        }
        const societyIdRegex = /^[A-Za-z0-9_-]{3,30}$/;
        if (!societyIdRegex.test(this.societyId)) {
            this.showToast('Society ID must be 3–30 characters; letters, numbers, dash and underscore allowed');
            return;
        }
        if (this.password !== this.confirm) {
            this.showToast('Passwords do not match');
            return;
        }
        if (this.password.length < 6) {
            this.showToast('Password must be at least 6 characters');
            return;
        }

        this.loading = true;
        const loader = await this.loadingCtrl.create({ message: 'Creating account...' });
        await loader.present();

        try {
            await this.auth.register(this.email, this.password, this.societyId);
            await loader.dismiss();
            this.loading = false;
            await this.showToast('New admin account created successfully!', 2000);
        } catch (e: any) {
            console.error(e);
            await loader.dismiss();
            this.loading = false;
            if (e.code === 'auth/email-already-in-use') {
                await this.showToast('This email is already registered');
            } else if (e.code === 'auth/invalid-email') {
                await this.showToast('Please enter a valid email address');
            } else if (e.code === 'auth/weak-password') {
                await this.showToast('Password is too weak');
            } else if (e.code === 'society/admin_exists') {
                await this.showToast('An admin for this society already exists');
            } else {
                await this.showToast('Registration failed: ' + (e.message || 'Unknown error'));
            }
        }
    }

    isSocietyIdValid(): boolean {
        const societyIdRegex = /^[A-Za-z0-9_-]{3,30}$/;
        return !!this.societyId && societyIdRegex.test(this.societyId);
    }

    async googleSignIn() {
        this.loading = true;
        const loader = await this.loadingCtrl.create({ message: 'Signing in with Google...' });
        await loader.present();
        try {
            await this.auth.signInWithGoogle();
            await loader.dismiss();
            this.loading = false;
            await this.showToast('Signed in with Google', 2000);
            this.router.navigate(['/dashboard']);
        } catch (e) {
            console.error(e);
            await loader.dismiss();
            this.loading = false;
            this.showToast('Google sign-in failed');
        }
    }

    togglePassword() {
        this.showPassword = !this.showPassword;
    }

    toggleConfirm() {
        this.showConfirm = !this.showConfirm;
    }
}
