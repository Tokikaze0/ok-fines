import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { StorageService } from '../services/storage.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private storage: StorageService,
    private router: Router
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    try {
      const token = await this.storage.get('access_token');
      if (token) {
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
