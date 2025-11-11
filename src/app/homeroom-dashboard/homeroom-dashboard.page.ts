import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-homeroom-dashboard',
  templateUrl: './homeroom-dashboard.page.html',
  styleUrls: ['./homeroom-dashboard.page.scss'],
  standalone: false,
})
export class HomeroomDashboardPage implements OnInit {
  constructor(
    private auth: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    // Verify user role on init
    this.checkUserRole();
  }

  private async showToast(message: string, duration = 3000) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();
  }

  private async checkUserRole() {
    try {
      // Add role verification logic here
      // For now, we'll just verify they're logged in
      const token = await this.auth.getToken();
      if (!token) {
        await this.showToast('Please login first');
        this.router.navigate(['/home']);
      }
    } catch (error) {
      console.error('Role check failed:', error);
      await this.showToast('Access denied');
      this.router.navigate(['/home']);
    }
  }

  async logout() {
    try {
      await this.auth.logout();
      await this.showToast('Successfully logged out');
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Logout failed:', error);
      await this.showToast('Logout failed. Please try again.');
    }
  }
}