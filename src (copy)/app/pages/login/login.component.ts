import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'th-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="stage">
      <div class="panel">
        <img class="logo" src="assets/logo-full.png" alt="Tridev Heights PG" />
        <h1>Management console</h1>
        <p class="sub">Admin sign-in.</p>

        <form (ngSubmit)="submit()">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" inputmode="email"
                   autocomplete="username" autocapitalize="none" spellcheck="false"
                   placeholder="admin@tridevheights.com" [(ngModel)]="email" />
          </div>

          <div class="field">
            <label for="pw">Password</label>
            <div class="pw-wrap">
              <input id="pw" name="pw" [type]="reveal() ? 'text' : 'password'"
                     autocomplete="current-password" placeholder="••••••••"
                     [(ngModel)]="password" />
              <button type="button" class="reveal"
                      [attr.aria-label]="reveal() ? 'Hide password' : 'Show password'"
                      (click)="reveal.set(!reveal())">
                {{ reveal() ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          @if (error()) {
            <p class="error-text" role="alert">{{ error() }}</p>
          }

          <button type="submit" class="btn btn-gold full" [disabled]="busy()">
            {{ busy() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      @use '../../../styles/variables' as *;

      .stage {
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: $grad-dark;
      }

      .panel {
        position: relative;
        width: 100%;
        max-width: 390px;
        background: $surface;
        border-radius: $radius-lg;
        box-shadow: $shadow-lg;
        padding: 38px 32px 32px;
        text-align: center;
        overflow: hidden;
        animation: rise 0.5s $ease both;
      }

      .panel::before {
        content: '';
        position: absolute;
        inset: 0 0 auto;
        height: 4px;
        background: $grad-gold;
      }

      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(14px);
        }
      }

      .logo {
        width: 148px;
        height: auto;
        margin: 0 auto 22px;
        display: block;
      }

      h1 {
        font-size: 21px;
      }

      .sub {
        margin: 6px 0 26px;
        font-size: 14px;
        color: $muted;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        text-align: left;
      }

      .pw-wrap {
        position: relative;

        input {
          padding-right: 66px;
        }
      }

      .reveal {
        position: absolute;
        top: 50%;
        right: 8px;
        transform: translateY(-50%);
        background: none;
        border: none;
        font-family: $font-body;
        font-size: 12.5px;
        font-weight: 600;
        color: $navy;
        cursor: pointer;
        padding: 6px 8px;
        border-radius: 8px;

        &:hover {
          background: rgba(30, 58, 95, 0.08);
        }
      }

      .full {
        width: 100%;
        margin-top: 4px;
        padding-block: 14px;
      }
    `
  ]
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  readonly reveal = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    if (this.auth.isSignedIn()) {
      this.router.navigateByUrl(this.returnUrl());
    }
  }

  async submit(): Promise<void> {
    if (!this.email.trim() || !this.password) {
      this.error.set('Enter both the email and the password.');
      return;
    }

    this.busy.set(true);
    try {
      const problem = await this.auth.signIn(this.email.trim(), this.password);
      if (problem) {
        this.error.set(problem);
        return;
      }
      this.error.set(null);
      this.router.navigateByUrl(this.returnUrl());
    } finally {
      this.busy.set(false);
    }
  }

  /** Only ever an in-app path, so a crafted link cannot redirect off-site. */
  private returnUrl(): string {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
  }
}
