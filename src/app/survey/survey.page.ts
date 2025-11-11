import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { NgForm } from '@angular/forms';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AuthService } from '../services/auth.service';

@Component({
    selector: 'app-survey',
    templateUrl: './survey.page.html',
    styleUrls: ['./survey.page.scss'],
    standalone: false,
})
export class SurveyPage implements OnInit {
    private auth = getAuth();
    private firestore = getFirestore();
    
    form = {
        fullName: '',
        contact: '',
        rating: '',
        comments: '',
        datetime: new Date().toISOString()
    };

    submitted = false;
    submitting = false;
    contactError = '';
    
    fieldStates: { [key: string]: { valid: boolean, touched: boolean } } = {
        fullName: { valid: false, touched: false },
        email: { valid: false, touched: false },
        rating: { valid: false, touched: false },
        datetime: { valid: false, touched: false },
        comments: { valid: false, touched: false }
    };

    latitude: number | null = null;
    longitude: number | null = null;
    gettingLocation = false;

    photoBase64: string | null = null;
    photoPreview: string | null = null;
    uploadingPhoto = false;

    constructor(
        private router: Router,
        private toastCtrl: ToastController,
        private loadingCtrl: LoadingController,
        private authService: AuthService
    ) { }

    private async showToast(message: string, color: 'success' | 'warning' | 'danger' = 'success', duration: number = 3000) {
        const toast = await this.toastCtrl.create({
            message,
            duration,
            color,
            position: 'bottom'
        });
        await toast.present();
    }

    async ngOnInit() {
        const token = await this.authService.getToken();
        if (!token) {
            await this.showToast('Please sign in to submit surveys', 'warning');
            this.router.navigate(['/home']);
            return;
        }
    }

    goBack() {
        this.router.navigate(['/dashboard']);
    }

    private isValidEmail(email: string): boolean {
        const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return re.test(email.toLowerCase());
    }

    onInputChange(control: any, fieldName: string) {
        if (!control) return;

        if (!this.fieldStates[fieldName]) {
            this.fieldStates[fieldName] = { valid: false, touched: false };
        }

        const value = control.value;
        this.fieldStates[fieldName].touched = true;
        
        switch (fieldName) {
            case 'fullName':
                this.fieldStates['fullName'].valid = value && value.trim().length >= 2;
                break;
            case 'email':
                this.fieldStates['email'].valid = this.isValidEmail(value || '');
                break;
            case 'rating':
                this.fieldStates['rating'].valid = !!value;
                break;
            case 'datetime':
                const date = value ? new Date(value) : null;
                this.fieldStates['datetime'].valid = !!date && date <= new Date();
                break;
        }
    }

    async getLocation() {
        this.gettingLocation = true;
        try {
            const pos = await Geolocation.getCurrentPosition();
            this.latitude = pos.coords.latitude;
            this.longitude = pos.coords.longitude;

            await this.showToast(`Location captured: ${this.latitude.toFixed(6)}, ${this.longitude.toFixed(6)}`, 'success');
        } catch (err) {
            console.error('Geolocation error', err);
            await this.showToast('Could not retrieve location. Make sure location services are enabled and permissions are granted.', 'danger');
        } finally {
            this.gettingLocation = false;
        }
    }

    async takePicture() {
        try {
            const hasCamera = await Camera.checkPermissions();
            if (hasCamera.camera !== 'granted') {
                await this.showToast('Camera permission required. Please grant camera access in settings.', 'warning');
                Camera.requestPermissions();
                return;
            }

            const photo = await Camera.getPhoto({
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera,
                quality: 30, 
                width: 800,
                height: 800, 
                correctOrientation: true
            });

            if (photo && photo.base64String) {
                if (photo.base64String.length > 0) {
                    this.photoBase64 = photo.base64String;
                    this.photoPreview = `data:image/jpeg;base64,${photo.base64String}`;
                    await this.showToast('Photo captured successfully', 'success');
                } else {
                    throw new Error('Invalid photo data');
                }
            } else {
                throw new Error('No photo data received');
            }
        } catch (err) {
            console.error('Camera error', err);
            
            let errorMessage = 'Could not capture photo. ';
            if (err instanceof Error) {
                if (err.message.includes('permission')) {
                    errorMessage += 'Camera permission is required.';
                } else if (err.message.includes('No photo data')) {
                    errorMessage += 'No photo was captured.';
                } else if (err.message.includes('Invalid')) {
                    errorMessage += 'Invalid photo data received.';
                } else {
                    errorMessage += 'Please try again.';
                }
            }
            
            await this.showToast(errorMessage, 'danger');
        }
    }

    private async getPhotoBase64(): Promise<string | null> {
        if (!this.photoBase64) return null;
        try {
            return this.photoBase64;
        } catch (err) {
            console.error('Upload photo error', err);
            return null;
        } finally {
            this.uploadingPhoto = false;
        }
    }

    async submit(surveyForm: NgForm) {
        this.submitted = true;
        this.contactError = '';

        const fullName = this.form.fullName?.trim();
        if (!fullName || fullName.length < 2) {
            return;
        }

        const contact = (this.form.contact || '').trim();
        if (!contact) {
            this.contactError = 'Email is required';
            return;
        }
        if (!this.isValidEmail(contact)) {
            this.contactError = 'Please enter a valid email address';
            return;
        }

        if (!this.form.rating) {
            return;
        }

        if (!this.form.datetime) {
            return;
        }
        const surveyDate = new Date(this.form.datetime);
        if (surveyDate > new Date()) {
            await this.showToast('Survey date cannot be in the future', 'warning');
            return;
        }

        if (this.latitude === null || this.longitude === null) {
            await this.showToast('Please capture your location before submitting the survey.', 'warning');
            return;
        }

        const loader = await this.loadingCtrl.create({
            message: 'Submitting survey...'
        });
        await loader.present();
        this.submitting = true;

        try {
            const token = await this.authService.getToken();
            if (!token) {
                await loader.dismiss();
                await this.showToast('Please sign in to submit surveys', 'warning');
                this.router.navigate(['/home']);
                return;
            }

            const currentUser = this.auth.currentUser;
            if (!currentUser) {
                throw new Error('Not authenticated');
            }

            const surveysRef = collection(this.firestore, 'surveys');
            const surveyData = {
                fullName: fullName,
                contact: contact.toLowerCase(),
                rating: String(this.form.rating),
                comments: this.form.comments || '',
                datetime: this.form.datetime,
                submittedAt: new Date().toISOString(),
                userId: currentUser.uid 
            };
            
            if (this.latitude !== null && this.longitude !== null) {
                (surveyData as any).latitude = this.latitude;
                (surveyData as any).longitude = this.longitude;
            }

            if (this.photoBase64) {
                const base64Image = await this.getPhotoBase64();
                if (base64Image) {
                    (surveyData as any).imageData = base64Image;
                } else {
                    await this.showToast('Could not process the photo. The survey will be saved without the image.', 'warning');
                }
            }

            let attempt = 0;
            let saved = false;
            while (attempt < 3 && !saved) {
                try {
                    await addDoc(surveysRef, surveyData);
                    saved = true;
                } catch (err) {
                    attempt++;
                    if (attempt === 3) throw err;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            await loader.dismiss();
            await this.showToast('Survey submitted successfully. Thank you!', 'success');

            this.form = { 
                fullName: '', 
                contact: '', 
                rating: '', 
                comments: '', 
                datetime: new Date().toISOString() 
            };
            surveyForm.resetForm(this.form);
            this.submitted = false;
        } catch (err) {
            console.error('Submit error:', err);
            await loader.dismiss();

            let errorMessage = 'Failed to submit survey. Please try again.';
            if (err instanceof Error) {
                if (err.message.includes('permission')) {
                    errorMessage = 'You do not have permission to submit surveys. Please sign in again.';
                    await this.authService.logout();
                } else if (err.message.includes('network')) {
                    errorMessage = 'Network error. Please check your connection and try again.';
                }
            }

            await this.showToast(errorMessage, 'danger');
        } finally {
            this.submitting = false;
        }
    }
}