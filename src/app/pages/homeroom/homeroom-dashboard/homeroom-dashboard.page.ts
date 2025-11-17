import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ToastController } from '@ionic/angular';

@Component({
    selector: 'app-homeroom-dashboard',
    templateUrl: './homeroom-dashboard.page.html',
    styleUrls: ['./homeroom-dashboard.page.scss'],
    standalone: false,
})
export class HomeroomDashboardPage {
    constructor(
        private auth: AuthService,
        private router: Router,
        private toastCtrl: ToastController
    ) {}

    async logout() {
        try {
            await this.auth.logout();
            await this.showToast('Successfully logged out');
            this.router.navigate(['/home']);
        } catch (error) {
            await this.showToast('Logout failed. Please try again.', 'danger');
        }
    }

    private async showToast(message: string, color: string = 'success', duration: number = 2000) {
        const toast = await this.toastCtrl.create({
            message,
            duration,
            color,
            position: 'bottom'
        });
        await toast.present();
    }
}
