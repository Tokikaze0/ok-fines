import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { StorageService } from '../services/storage.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(
    private storage: StorageService,
    private router: Router
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    try {
      const role = await this.storage.get('user_role');
      const token = await this.storage.get('access_token');

      if (role === 'admin' && token) {
        return true;
      }

      this.router.navigate(['/home']);
      return false;
    } catch (error) {
      this.router.navigate(['/home']);
      return false;
    }
  }
}
