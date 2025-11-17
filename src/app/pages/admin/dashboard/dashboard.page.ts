import { Component } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  standalone: false
})
export class DashboardPage {
  constructor(
    private auth: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  private async showToast(message: string, color: string = 'success', duration: number = 2000) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  async logout() {
    try {
      await this.auth.logout();
      await this.router.navigate(['/home']);
      await this.showToast('Successfully logged out!');
    } catch (error) {
      console.error('Logout error:', error);
      await this.showToast('Error during logout. Please try again.', 'danger');
    }
  }

  openSurvey() {
    this.router.navigate(['/survey']).catch(async err => {
      console.error('Navigation error to /survey:', err);
      await this.showToast('Could not open Survey. See console for details.', 'danger');
    });
  }
}
