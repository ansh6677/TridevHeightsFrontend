import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ROLE_ADMIN } from './models';

const TOKEN_KEY = 'th-pms-token';
const NAME_KEY = 'th-pms-name';
const ROLE_KEY = 'th-pms-role';
const LAST_KEY = 'th-pms-last-login';
const LAST_BY_KEY = 'th-pms-last-login-by';

interface LoginResponse {
  token: string;
  name: string;
  email: string;
  role: number;
  roleLabel: string;
  expiresIn: number;
  /**
   * When the application was last signed into by anyone. Shared, not
   * per-user — everybody sees the same figure.
   */
  lastLoginAt?: string;
  lastLoginBy?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _token = signal<string | null>(read(TOKEN_KEY));
  private readonly _name = signal<string | null>(read(NAME_KEY));
  private readonly _role = signal<number>(Number(read(ROLE_KEY) ?? 1));
  private readonly _lastLogin = signal<string | null>(read(LAST_KEY));
  private readonly _lastLoginBy = signal<string | null>(read(LAST_BY_KEY));

  readonly name = this._name.asReadonly();
  readonly role = this._role.asReadonly();

  /** When anyone last signed into the application, before this session. */
  readonly lastLogin = this._lastLogin.asReadonly();
  readonly lastLoginBy = this._lastLoginBy.asReadonly();

  /** "Last login: 5 Aug, 9:12 pm", or null on a first-ever sign-in. */
  readonly lastLoginLabel = computed(() => {
    const iso = this._lastLogin();
    if (!iso) {
      return null;
    }
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) {
      return null;
    }
    return at.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'
    });
  });
  readonly isSignedIn = computed(() => this._token() !== null);

  /** Everything that writes is gated on this. The server enforces it too. */
  readonly isAdmin = computed(() => this._role() === ROLE_ADMIN);
  readonly roleLabel = computed(() => (this.isAdmin() ? 'Full access' : 'View only'));

  get token(): string | null {
    return this._token();
  }

  /** Resolves to null on success, or a message to show the person. */
  async signIn(email: string, password: string): Promise<string | null> {
    try {
      const res = await firstValueFrom(
        this.http.post<LoginResponse>(`${environment.apiBase}/auth/login`, { email, password })
      );
      this._token.set(res.token);
      this._name.set(res.name);
      this._role.set(res.role);
      this._lastLogin.set(res.lastLoginAt ?? null);
      this._lastLoginBy.set(res.lastLoginBy ?? null);
      write(TOKEN_KEY, res.token);
      write(NAME_KEY, res.name);
      write(ROLE_KEY, String(res.role));
      write(LAST_KEY, res.lastLoginAt ?? null);
      write(LAST_BY_KEY, res.lastLoginBy ?? null);
      return null;
    } catch (e: unknown) {
      const err = e as { status?: number; error?: { message?: string } };
      if (err?.status === 401) {
        return err.error?.message ?? 'That email and password do not match.';
      }
      if (err?.status === 0) {
        return 'Could not reach the server. Is the backend running?';
      }
      return 'Sign-in failed. Try again in a moment.';
    }
  }

  signOut(): void {
    this._token.set(null);
    this._name.set(null);
    this._role.set(1);
    this._lastLogin.set(null);
    this._lastLoginBy.set(null);
    write(TOKEN_KEY, null);
    write(NAME_KEY, null);
    write(ROLE_KEY, null);
    write(LAST_KEY, null);
    write(LAST_BY_KEY, null);
  }
}

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
    }
  } catch {
    // Private browsing can block storage; the signals still hold the session.
  }
}

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isSignedIn()) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps viewers off admin-only screens such as Users. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAdmin() ? true : router.createUrlTree(['/dashboard']);
};
