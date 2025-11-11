import { Component, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  email = '';
  password = '';
  confirm = '';
  showPassword = false;

  constructor(
    private api: ApiService,
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) { }

  private async showToast(message: string, duration = 3000) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();
  }

  async login() {
    try {
      await this.auth.login(this.email, this.password);
      await this.showToast('Login successful!', 2000);
    } catch (e) {
      console.error(e);
      await this.showToast('Login failed. Please check your credentials.');
    }
  }

  async logout() {
    try {
      await this.auth.logout();
      await this.showToast('Successfully logged out!', 2000);
    } catch (error) {
      console.error('Logout error:', error);
      await this.showToast('Error during logout. Please try again.');
    }
  }

  loadUsers() {
    this.api.getUsers().subscribe(data => {
      console.log('Users:', data);
      this.showToast('Users loaded! Check console.');
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  @HostListener('document:keydown.enter', ['$event'])
  handleEnterKey(event: KeyboardEvent) {
    if (document.activeElement && (document.activeElement as HTMLElement).tagName === 'INPUT') {
      this.login();
    }
  }
}
