import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { environment } from '../../environments/environment';

@Component({
    selector: 'app-landing',
    templateUrl: './landing.page.html',
    styleUrls: ['./landing.page.scss'],
    standalone: true,
    imports: [IonicModule, CommonModule, FormsModule]
})
export class LandingPage {
    studentId = '';
    loading = false;
    errorMessage = '';
    isValid = false;

    // Accept pattern like MMC2025-00109 (3 letters, 4 digits, dash, 5 digits)
    private readonly ID_REGEX = /^[A-Z]{3}\d{4}-\d{5}$/;

    constructor(private router: Router) {}

    private app = initializeApp(environment.firebaseConfig);
    private firestore = getFirestore(this.app);

    onInputChange(value: string) {
        const cleaned = (value || '').replace(/\s+/g, '').toUpperCase();
        this.studentId = cleaned;
        this.isValid = this.ID_REGEX.test(cleaned);
        if (this.errorMessage && this.isValid) this.errorMessage = '';
    }

    async onSearch() {
        const id = (this.studentId || '').trim();
        if (!id) {
            this.errorMessage = 'Please enter your student ID.';
            this.isValid = false;
            return;
        }
        if (!this.ID_REGEX.test(id)) {
            this.errorMessage = 'ID format looks incorrect. Example: MMC2025-00109';
            this.isValid = false;
            return;
        }

        this.errorMessage = '';
        this.loading = true;
        try {
            // Try to find student in `students` collection by doc id
            const studentDocRef = doc(this.firestore, 'students', id);
            const studentSnap = await getDoc(studentDocRef);
            if (studentSnap.exists()) {
                await this.router.navigate(['/student-fees'], { queryParams: { studentId: id } });
            } else {
                // If not found, still navigate to student-fees which will try alternate lookups
                await this.router.navigate(['/student-fees'], { queryParams: { studentId: id } });
            }
        } finally {
            this.loading = false;
        }
    }

    goHome() {
        // programmatic navigate to home — use navigateByUrl to avoid routerLink issues
        this.router.navigateByUrl('/home');
    }
}
