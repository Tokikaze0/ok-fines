import { Component, OnInit } from '@angular/core';
import { UserManagementService } from '@core/services/user-management.service';
import { User } from '@core/models/user.model';
import { ToastController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
    selector: 'app-student-user-management',
    templateUrl: './student-user-management.page.html',
    styleUrls: ['./student-user-management.page.scss'],
    standalone: false,
})
export class StudentUserManagementPage implements OnInit {
    users: any[] = [];
    filteredUsers: any[] = [];
    searchQuery = '';
    email = '';
    password = '';
    confirm = '';
    studentId = '';
    society = '';
    lastName = '';
    firstName = '';
    middleName = '';
    programId = '';
    collegeId = '';
    selectedUser: any | null = null;
    isEditing = false;
    isUploading = false;
    bulkImportMode: 'auth' | 'collection' = 'collection'; // Default to collection mode for students_filtered.csv

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
            // Wait for authentication to be ready (with timeout)
            let retries = 0;
            const maxRetries = 5;
            let studentsData: any[] = [];
            
            while (retries < maxRetries) {
                try {
                    // Load students from the students collection instead of users collection
                    studentsData = await this.userManagement.getAllStudentsFromCollection();
                    break; // Success, exit retry loop
                } catch (error: any) {
                    if (error.message.includes('No authenticated user found') && retries < maxRetries - 1) {
                        console.warn(`Retry ${retries + 1}/${maxRetries}: Waiting for authentication...`);
                        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
                        retries++;
                    } else {
                        throw error; // Re-throw if not auth error or max retries reached
                    }
                }
            }
            
            this.users = studentsData;
            // Initialize filtered list and ensure sorted order
            this.filteredUsers = [...this.users];
            await loader.dismiss();
        } catch (error: any) {
            console.error('Error loading students:', error);
            await loader.dismiss();
            await this.showToast('Failed to load students: ' + (error.message || 'Unknown error'));
        }
    }

    onSearch(event: any) {
        const q = (this.searchQuery || (event && (event.detail ? event.detail.value : event.target.value)) || '').toString().trim().toLowerCase();
        if (!q) {
            this.filteredUsers = [...this.users];
            return;
        }

        this.filteredUsers = this.users.filter(u => {
            const fullName = (u.fullName || ((u.lastName || '') + ', ' + (u.firstName || '') + ' ' + (u.middleName || '')) || '').toString().toLowerCase();
            const studentId = (u.studentId || '').toString().toLowerCase();
            return fullName.includes(q) || studentId.includes(q);
        });
    }

    async addUser() {
        // If in collection-only mode, do not require email/password
        if (this.bulkImportMode === 'collection') {
            if (!this.studentId || !this.society) {
                this.showToast('Please provide all required fields');
                return;
            }
            // Normalize & validate student ID format (accept MMC2025 and variants)
            const normalizedId = this.normalizeStudentId(this.studentId);
            if (!normalizedId) {
                this.showToast('Invalid student ID format. Supported examples: MMC2021-00653, MMC2024-00531, C12-34');
                return;
            }
            this.studentId = normalizedId;
            const loader = await this.loadingCtrl.create({ message: 'Creating student...' });
            await loader.present();
            try {
                // Only save to students collection, no Auth
                await this.userManagement.createBulkStudentsToCollection([
                    {
                        email: '',
                        password: '',
                        studentId: this.studentId,
                        society: this.society,
                        lastName: '',
                        firstName: '',
                        middleName: '',
                        programId: '',
                        collegeId: '',
                        yearLevelId: '',
                        sectionId: ''
                    }
                ]);
                await loader.dismiss();
                this.showToast('Student created successfully');
                this.resetForm();
                this.loadUsers();
            } catch (error: any) {
                console.error('Error creating student:', error);
                await loader.dismiss();
                await this.showToast('Failed to create student: ' + (error.message || 'Unknown error'));
            }
        } else {
            // Auth mode: require email/password
            if (!this.email || !this.password || !this.studentId || !this.society) {
                this.showToast('Please provide all required fields');
                return;
            }
            if (this.password !== this.confirm) {
                this.showToast('Passwords do not match');
                return;
            }
            // Normalize & validate student ID format (accept MMC2025 and variants)
            const normalizedAuthId = this.normalizeStudentId(this.studentId);
            if (!normalizedAuthId) {
                this.showToast('Invalid student ID format. Supported examples: MMC2021-00653, MMC2024-00531, C12-34');
                return;
            }
            this.studentId = normalizedAuthId;
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

    /**
     * Parse a CSV line properly, handling quoted fields that may contain commas.
     * Example: 20,LIAN,CHRISTIAN JAY,"PEDRO,",MMC2025-00109,...
     * Result: ["20", "LIAN", "CHRISTIAN JAY", "PEDRO,", "MMC2025-00109", ...]
     */
    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                // Toggle quote state
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                // End of field (comma outside quotes)
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        // Don't forget the last field
        if (current || result.length > 0) {
            result.push(current.trim());
        }
        return result;
    }

    /**
     * Normalize student ID formats and pad numeric part to 5 digits when appropriate.
     * Examples handled:
     *  - "MMC2025 - 00101" -> "MMC2025-00101"
     *  - "MMC2021-0653" -> "MMC2021-00653" (pads to 5 digits)
     *  - "C12-34" -> unchanged
     */
    private normalizeStudentId(raw: string): string | null {
        if (!raw || typeof raw !== 'string') return null;
        // Remove surrounding whitespace and normalize spaces around dash
        let s = raw.trim().toUpperCase();
        // Replace occurrences like " - " or " -" or "- " with a single dash
        s = s.replace(/\s*-\s*/g, '-');
        // Remove any accidental inner spaces
        s = s.replace(/\s+/g, '');

        // Accept C##-## style IDs as-is
        if (/^C\d+-\d+$/.test(s)) return s;

        // Match MMCYYYY-NNNN or MMCYYYY-NNNNN
        const m = s.match(/^MMC(\d{4})-(\d{4,5})$/);
        if (m) {
            const year = m[1];
            let num = m[2];
            // If numeric part is 4 digits, pad to 5 digits by prefixing a zero
            if (num.length === 4) num = '0' + num;
            // Ensure the standardized form is MMCYYYY-NNNNN
            return `MMC${year}-${num}`;
        }

        // Match older MMC####-#### form and leave as-is
        if (/^MMC\d{4}-\d{4}$/.test(s)) return s;

        return null;
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
            const students = await this.detectAndParseCSV(file);
            
            // Use collection mode or auth mode based on toggle
            const results = this.bulkImportMode === 'collection'
                ? await this.userManagement.createBulkStudentsToCollection(students)
                : await this.userManagement.createBulkStudents(students);
            
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
                const errorDetails = results.errors.map(e => `${e.email}: ${e.error}`).join('\n');
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
                    const lines = text.split('\n');
                    const students: { email: string; password: string; studentId: string; society: string }[] = [];

                    // Skip header row if it exists
                    const startIndex = lines[0].toLowerCase().includes('email') ? 1 : 0;

                    const studentIdRegex = /^MMC20\d{2}-\d{4,5}$|^MMC\d{4}-\d{4}$|^C\d+-\d+$/;

                    for (let i = startIndex; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;

                        // Use proper CSV parser to handle quoted fields
                        const parts = this.parseCSVLine(line);
                        if (parts.length < 4) {
                            throw new Error(`Row ${i + 1}: Expected at least 4 columns, got ${parts.length}`);
                        }

                        let [email, password, studentId, society] = parts;

                        if (!email || !password || !society) {
                            throw new Error(`Row ${i + 1}: Missing required fields (email, password, or society)`);
                        }

                        // Remove ALL whitespace inside the studentId token before normalization
                        studentId = (studentId || '').replace(/\s+/g, '');
                        if (!studentId) {
                            throw new Error(`Row ${i + 1}: Missing or empty student ID`);
                        }
                        const normalized = this.normalizeStudentId(studentId);
                        if (!normalized) {
                            throw new Error(`Row ${i + 1}: Invalid student ID format for "${studentId}". Supported: MMC202*-00***, MMC####-#### or C##-##`);
                        }
                        students.push({ email, password, studentId: normalized, society });
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

    /**
     * Detect CSV format and parse accordingly
     */
    private async detectAndParseCSV(file: File): Promise<any> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const text = reader.result as string;
                    const lines = text.split('\n').filter(l => l.trim());
                    if (lines.length < 1) {
                        reject(new Error('CSV file is empty'));
                        return;
                    }

                    const headerLine = lines[0].toLowerCase();

                    // Check if this is students_filtered.csv format (has studentnum, firstname)
                    if (headerLine.includes('studentnum') || headerLine.includes('firstname')) {
                        const parsed = this.parseStudentsFilteredCSV(lines);
                        resolve(parsed);
                    } else if (headerLine.includes('email') && headerLine.includes('password')) {
                        // Legacy format with email, password, studentId, society
                        const parsed = this.parseLegacyCSVFormat(lines);
                        resolve(parsed);
                    } else {
                        reject(new Error('Unknown CSV format. Expected either legacy (email, password, studentId, society) or students_filtered (studentNum, firstName, lastName, etc.)'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Parse legacy CSV format: email, password, studentId, society
     */
    private parseLegacyCSVFormat(lines: string[]): { email: string; password: string; studentId: string; society: string }[] {
        const students: { email: string; password: string; studentId: string; society: string }[] = [];
        const studentIdRegex = /^MMC\d{4}-\d{4}$|^MMC20\d{2}-\d{4,5}$|^C\d+-\d+$/;
        const startIndex = 1; // Skip header

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Use proper CSV parser to handle quoted fields
            const parts = this.parseCSVLine(line);
            if (parts.length < 4) {
                throw new Error(`Row ${i + 1}: Expected at least 4 columns, got ${parts.length}`);
            }

            const [email, password, studentId, society] = parts;
            if (!email || !password || !society) {
                throw new Error(`Row ${i + 1}: Missing required fields (email, password, or society)`);
            }
            // Remove all whitespace inside the studentId token (to handle variants like "MMC2025 - 00101")
            const cleanedId = (studentId || '').replace(/\s+/g, '');
            if (!cleanedId) {
                throw new Error(`Row ${i + 1}: Missing or empty student ID`);
            }
            const normalized = this.normalizeStudentId(cleanedId);
            if (!normalized) {
                throw new Error(`Row ${i + 1}: Invalid student ID format for "${studentId}". Supported: MMC202*-00***, MMC####-#### or C##-##`);
            }
            students.push({ email, password, studentId: normalized, society });
        }
        return students;
    }

    /**
     * Parse students_filtered.csv format
     * Columns: ID,lastName,firstName,middleName,studentNum,society,programID,collegeID,yearLevelID,sectionID
     * Auto-generates email and temporary password.
     */
    private parseStudentsFilteredCSV(lines: string[]): any[] {
        const students: any[] = [];
        const studentIdRegex = /^MMC\d{4}-\d{4}$|^MMC20\d{2}-\d{5}$|^C\d+-\d+$/;
        const startIndex = 1; // Skip header

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Use proper CSV parser to handle quoted fields with commas inside
            const parts = this.parseCSVLine(line);
            if (parts.length < 10) {
                throw new Error(`Row ${i + 1}: Expected at least 10 columns, got ${parts.length}`);
            }

            const [id, lastName, firstName, middleName, studentNum, society, programId, collegeId, yearLevelId, sectionId] = parts;

            if (!firstName || !lastName) {
                throw new Error(`Row ${i + 1}: Missing required fields (firstName or lastName)`);
            }

            // Remove ALL whitespace in the studentNum token (handles entries like "MMC2025 - 00101")
            const cleanedStudentNum = (studentNum || '').replace(/\s+/g, '');
            if (!cleanedStudentNum) {
                throw new Error(`Row ${i + 1}: Missing or empty student number/ID`);
            }
            // Normalize studentNum into a standard student ID
            let studentId = this.normalizeStudentId(cleanedStudentNum);
            if (!studentId) {
                throw new Error(`Row ${i + 1}: Invalid student ID format for "${studentNum}". Supported: MMC202*-00***, MMC####-#### or C##-##`);
            }

            // Auto-generate email from student ID
            const email = `${studentId.toLowerCase()}@student.edu`;
            // Temporary password: first name initial + last name initial + @ + last 4 digits of student ID
            const studentNumDigits = studentId.replace(/\D/g, '').slice(-4) || '0000';
            const tempPassword = `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}@${studentNumDigits}`;

            students.push({
                email,
                password: tempPassword,
                studentId,
                lastName: lastName || '',
                firstName: firstName || '',
                middleName: middleName || '',
                programId: programId || '',
                collegeId: collegeId || '',
                yearLevelId: yearLevelId || '',
                sectionId: sectionId || '',
                society: society || ''
            });
        }
        return students;
    }
}
