import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { StorageService } from '../services/storage.service';

/**
 * Auth Interceptor
 * Automatically attaches authentication token to all HTTP requests
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private storage: StorageService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return from(this.storage.get('access_token')).pipe(
      switchMap(token => {
        if (token) {
          const cloned = req.clone({
            headers: req.headers.set('Authorization', `Bearer ${token}`)
          });
          return next.handle(cloned);
        }
        return next.handle(req);
      })
    );
  }
}
