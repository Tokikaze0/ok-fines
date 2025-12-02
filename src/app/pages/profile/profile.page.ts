import { Component, OnInit } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { sendPasswordResetEmail } from 'firebase/auth';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {
  userProfile: any = null;
  isLoading = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) { }

  async ngOnInit() {
    await this.loadProfile();
  }

  async loadProfile() {
    this.isLoading = true;
    try {
      const user = this.authService.auth.currentUser;
      if (user) {
        this.userProfile = await this.authService.getUserProfile(user.uid);
        // Add email from Auth object if not in Firestore
        if (this.userProfile && !this.userProfile.email) {
            this.userProfile.email = user.email;
        }
      }
    } catch (error) {
      console.error('Error loading profile', error);
    } finally {
      this.isLoading = false;
    }
  }

  async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Logout',
          handler: async () => {
            await this.authService.auth.signOut();
            this.router.navigate(['/home']);
          }
        }
      ]
    });
    await alert.present();
  }

  async resetPassword() {
    if (!this.userProfile?.email) {
      this.showToast('No email found for this user.', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Reset Password',
      message: `Send a password reset link to ${this.userProfile.email}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Send',
          handler: async () => {
            try {
              await sendPasswordResetEmail(this.authService.auth, this.userProfile.email);
              this.showToast('Password reset email sent!', 'success');
            } catch (error: any) {
              this.showToast(error.message, 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color
    });
    await toast.present();
  }
}
