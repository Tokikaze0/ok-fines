import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
            await this.router.navigate(['/student-fees'], { queryParams: { studentId: id } });
        } finally {
            this.loading = false;
        }
    }

    goHome() {
        // programmatic navigate to home — use navigateByUrl to avoid routerLink issues
        this.router.navigateByUrl('/home');
    }
}
