import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { UserManagementService } from '@core/services/user-management.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { onAuthStateChanged, Unsubscribe } from 'firebase/auth';

@Component({
    selector: 'app-homeroom-dashboard',
    templateUrl: './homeroom-dashboard.page.html',
    styleUrls: ['./homeroom-dashboard.page.scss'],
    standalone: false,
})
export class HomeroomDashboardPage implements OnInit, OnDestroy {
    currentUser: any = null;
    students: any[] = [];
    isLoading = false;
    sectionInfo = '';
    private authUnsub?: Unsubscribe;

    constructor(
        private auth: AuthService,
        private userMgmt: UserManagementService,
        private router: Router,
        private toastCtrl: ToastController,
        private loadingCtrl: LoadingController
    ) {}

    ngOnInit() {
        this.isLoading = true;
        // Wait for Auth State to be ready
        this.authUnsub = onAuthStateChanged(this.auth.auth, async (user) => {
            if (user) {
                await this.loadProfileAndStudents(user.uid);
            } else {
                this.isLoading = false;
                // AuthGuard should handle redirect, but just in case
                this.router.navigate(['/landing']);
            }
        });
    }

    ngOnDestroy() {
        if (this.authUnsub) {
            this.authUnsub();
        }
    }

    async loadProfileAndStudents(uid: string) {
        try {
            this.currentUser = await this.auth.getUserProfile(uid);
            
            if (this.currentUser && this.currentUser.yearLevelId && this.currentUser.sectionId) {
                this.sectionInfo = `Year ${this.currentUser.yearLevelId} - Section ${this.currentUser.sectionId}`;
                this.students = await this.userMgmt.getStudentsBySection(this.currentUser.yearLevelId, this.currentUser.sectionId);
            } else {
                this.sectionInfo = 'No Section Assigned';
                this.students = [];
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showToast('Error loading dashboard data', 'danger');
        } finally {
            this.isLoading = false;
        }
    }

    goToTrackPayments() {
        this.router.navigate(['/track-payments']);
    }

    async logout() {
        try {
            await this.auth.logout();
            await this.showToast('Successfully logged out');
            this.router.navigate(['/landing']);
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
