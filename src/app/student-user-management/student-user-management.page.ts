import { Component, OnInit } from '@angular/core';
import { UserManagementService, User } from '../services/user-management.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
    selector: 'app-student-user-management',
    templateUrl: './student-user-management.page.html',
    styleUrls: ['./student-user-management.page.scss'],
    standalone: false,
})
export class StudentUserManagementPage implements OnInit {
    users: User[] = [];
    email = '';
    password = '';
    confirm = '';
    studentId = '';
    society = '';
    selectedUser: User | null = null;
    isEditing = false;
    isUploading = false;

    constructor(
        private userManagement: UserManagementService,
        private toastCtrl: ToastController,
        private loadingCtrl: LoadingController,
        private router: Router
    ) { }

    ngOnInit() {
        this.loadUsers();
    }

    async loadUsers() {
        const loader = await this.loadingCtrl.create({ message: 'Loading students...' });
        await loader.present();
        try {
            this.users = await this.userManagement.getAllStudentUsers();
            await loader.dismiss();
        } catch (error: any) {
            console.error('Error loading students:', error);
            await loader.dismiss();
            await this.showToast('Failed to load students: ' + (error.message || 'Unknown error'));
        }
    }

    async addUser() {
        if (!this.email || !this.password || !this.studentId || !this.society) {
            this.showToast('Please provide all required fields');
            return;
        }
        if (this.password !== this.confirm) {
            this.showToast('Passwords do not match');
            return;
        }

        // Validate student ID format
        const studentIdRegex = /^MMC20\d{2}-\d{5}$/;
        if (!studentIdRegex.test(this.studentId)) {
            this.showToast('Invalid student ID format. Must be MMC20**-*****');
            return;
        }

        const loader = await this.loadingCtrl.create({ message: 'Creating student...' });
        await loader.present();
        try {
            await this.userManagement.createStudentUser(this.email, this.password, this.studentId, this.society);
            await loader.dismiss();
            this.showToast('Student created successfully');
            this.resetForm();
            this.loadUsers();
        } catch (error: any) {
            console.error('Error creating student:', error);
            await loader.dismiss();
            await this.showToast('Failed to create student: ' + (error.message || 'Unknown error'));
        }
    }

    async editUser(user: User) {
        this.selectedUser = user;
        this.email = user.email;
        this.isEditing = true;
    }

    async updateUser() {
        if (!this.selectedUser || !this.email) {
            this.showToast('Invalid user data');
            return;
        }
        const loader = await this.loadingCtrl.create({ message: 'Updating student...' });
        await loader.present();
        try {
            await this.userManagement.updateStudentUser(this.selectedUser.uid, { email: this.email });
            await loader.dismiss();
            this.showToast('Student updated successfully');
            this.resetForm();
            this.loadUsers();
        } catch (error: any) {
            console.error('Error updating student:', error);
            await loader.dismiss();
            await this.showToast('Failed to update student: ' + (error.message || 'Unknown error'));
        }
    }

    async confirmDelete(user: User) {
        const toast = await this.toastCtrl.create({
            message: `Are you sure you want to delete ${user.email}?`,
            position: 'bottom',
            duration: 5000,
            buttons: [
                { text: 'Cancel', role: 'cancel', icon: 'close-circle' },
                { text: 'Delete', role: 'destructive', icon: 'trash', handler: () => { this.deleteUser(user); } }
            ],
            color: 'warning',
            cssClass: 'delete-toast'
        });
        await toast.present();
    }

    async deleteUser(user: User) {
        const loader = await this.loadingCtrl.create({ message: 'Deleting student...' });
        await loader.present();
        try {
            await this.userManagement.deleteStudentUser(user.uid);
            await loader.dismiss();
            this.showToast('Student deleted successfully');
            this.loadUsers();
        } catch (error: any) {
            console.error('Error deleting student:', error);
            await loader.dismiss();
            await this.showToast('Failed to delete student: ' + (error.message || 'Unknown error'));
        }
    }

    resetForm() {
        this.email = '';
        this.password = '';
        this.confirm = '';
        this.selectedUser = null;
        this.isEditing = false;
    }

    private async showToast(message: string, duration = 3000) {
        const toast = await this.toastCtrl.create({ message, duration });
        await toast.present();
    }

    goBack() {
        this.router.navigate(['/dashboard']);
    }

    async onFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.type !== 'text/csv') {
            await this.showToast('Please select a CSV file');
            return;
        }

        this.isUploading = true;
        const loader = await this.loadingCtrl.create({ message: 'Processing CSV...' });
        await loader.present();

        try {
            const students = await this.parseCSV(file);
            const results = await this.userManagement.createBulkStudents(students);
            
            await loader.dismiss();
            this.isUploading = false;

            // Show results
            const successMessage = results.success.length > 0 
                ? `Successfully created ${results.success.length} students. ` 
                : '';
            const errorMessage = results.errors.length > 0 
                ? `Failed to create ${results.errors.length} students.` 
                : '';
            
            await this.showToast(successMessage + errorMessage);
            
            // If there were errors, show detailed error toast
            if (results.errors.length > 0) {
                const errorDetails = results.errors.map(e => `${e.email}: ${e.error}`).join('\\n');
                await this.showToast(errorDetails, 5000);
            }

            this.loadUsers(); // Refresh the user list
        } catch (error: any) {
            await loader.dismiss();
            this.isUploading = false;
            await this.showToast('Error processing CSV: ' + (error.message || 'Unknown error'));
        }
    }

    private parseCSV(file: File): Promise<{ email: string; password: string; studentId: string; society: string }[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const text = reader.result as string;
                    const lines = text.split('\\n');
                    const students: { email: string; password: string; studentId: string; society: string }[] = [];

                    // Skip header row if it exists
                    const startIndex = lines[0].toLowerCase().includes('email') ? 1 : 0;

                    const studentIdRegex = /^MMC20\d{2}-\d{5}$/;

                    for (let i = startIndex; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;

                        const [email, password, studentId, society] = line.split(',').map(item => item.trim());
                        
                        if (!email || !password || !studentId || !society) {
                            throw new Error(`Row ${i + 1}: Missing required fields`);
                        }

                        if (!studentIdRegex.test(studentId)) {
                            throw new Error(`Row ${i + 1}: Invalid student ID format for ${studentId}. Must be MMC20**-*****`);
                        }

                        students.push({ email, password, studentId, society });
                    }

                    resolve(students);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
}
