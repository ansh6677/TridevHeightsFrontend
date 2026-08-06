import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Attaches the token, and on a 401 clears the session and sends the admin back
 * to sign in. Without this a lapsed token shows empty screens with no reason.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.token;
  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // A 403 means "signed in but not allowed" — never sign them out for that.
      // Only a 401 (no token, or lapsed) sends someone back to the login screen.
      const isLoginCall = req.url.includes('/auth/login');
      if (error.status === 401 && !isLoginCall) {
        auth.signOut();
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    })
  );
};
