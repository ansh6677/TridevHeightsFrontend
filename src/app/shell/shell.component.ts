import { Component, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { lockScroll } from '../core/scroll-lock';

const RAIL_KEY = 'th-pms-rail';

@Component({
  selector: 'th-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell" [class.rail]="rail()" [class.open]="drawer()">
      <!-- Small screens get a bar with a hamburger; the sidebar becomes a drawer -->
      <header class="topbar">
        <button type="button" class="burger" aria-label="Open menu" (click)="drawer.set(true)">
          <span></span><span></span><span></span>
        </button>
        <img src="assets/logo-mark.png" alt="" width="28" height="24" />
        <strong>Tridev Heights</strong>

        @if (auth.lastLoginLabel(); as seen) {
          <span class="seen-card" [title]="'You were last signed in on ' + seen">
            <svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true">
              <circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor"
                      stroke-width="1.6" />
              <path d="M10 6.2V10l2.6 1.6" fill="none" stroke="currentColor"
                    stroke-width="1.6" stroke-linecap="round" />
            </svg>
            <span class="seen-text">
              <em>Last used</em>
              <b>
                {{ seen }}
                @if (auth.lastLoginBy(); as who) {
                  · {{ who }}
                }
              </b>
            </span>
          </span>
        }
      </header>

      <div class="scrim" (click)="drawer.set(false)"></div>

      <aside class="side">
        <div class="side-top">
          <a class="brand" routerLink="/dashboard" (click)="drawer.set(false)">
            <img src="assets/logo-mark.png" alt="" width="34" height="28" />
            <span>
              <strong>Tridev Heights</strong>
              <small>Management</small>
            </span>
          </a>

          <button type="button" class="pin" (click)="toggleRail()"
                  [attr.aria-label]="rail() ? 'Widen the sidebar' : 'Narrow the sidebar'"
                  [attr.title]="rail() ? 'Widen the sidebar' : 'Narrow the sidebar'">
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path d="M12.5 5 7.5 10l5 5" fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <button type="button" class="shut" aria-label="Close menu" (click)="drawer.set(false)">
            &times;
          </button>
        </div>

        <!-- The dot on each link is the colour that screen is about:
             orange for the beds, green for money in, red for money out. -->
        <nav>
          <a routerLink="/dashboard" routerLinkActive="on" title="Dashboard"
             (click)="drawer.set(false)">
            <i class="dot d-navy"></i>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 3h6v6H3zM11 3h6v4h-6zM11 9h6v8h-6zM3 11h6v6H3z" fill="currentColor" />
            </svg>
            <span class="label">Dashboard</span>
          </a>

          <a routerLink="/flats" routerLinkActive="on" title="Flats" (click)="drawer.set(false)">
            <i class="dot d-vacant"></i>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 17V5l6-2v14zM11 17V8l6 2v7z" fill="currentColor" />
              <path d="M5 7h2M5 10h2M5 13h2M13 12h2" stroke="#fff" stroke-width="1.2"
                    stroke-linecap="round" />
            </svg>
            <span class="label">Flats</span>
          </a>

          <a routerLink="/receipts" routerLinkActive="on" title="Receipts"
             (click)="drawer.set(false)">
            <i class="dot d-green"></i>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 2h10v16l-2.5-1.6L10 18l-2.5-1.6L5 18z" fill="currentColor" />
              <path d="M8 6h4M8 9h4" stroke="#fff" stroke-width="1.3" stroke-linecap="round" />
            </svg>
            <span class="label">Receipts</span>
          </a>

          <a routerLink="/expenses" routerLinkActive="on" title="Expenses"
             (click)="drawer.set(false)">
            <i class="dot d-red"></i>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                    fill="currentColor" />
              <circle cx="13.5" cy="10" r="1.5" fill="#fff" />
            </svg>
            <span class="label">Expenses</span>
          </a>

          <a routerLink="/partners" routerLinkActive="on" title="Partner spending"
             (click)="drawer.set(false)">
            <i class="dot d-gold"></i>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="7" cy="7" r="3" fill="currentColor" />
              <circle cx="14" cy="8" r="2.4" fill="currentColor" opacity="0.75" />
              <path d="M2 17c0-2.8 2.2-5 5-5s5 2.2 5 5z" fill="currentColor" />
              <path d="M13 17c0-2 .8-3.6 2-4.4 1.8.5 3 2.2 3 4.4z"
                    fill="currentColor" opacity="0.75" />
            </svg>
            <span class="label">Partners</span>
          </a>

          @if (auth.isAdmin()) {
            <a routerLink="/users" routerLinkActive="on" title="Logins"
               (click)="drawer.set(false)">
              <i class="dot d-hall"></i>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="7.5" cy="7" r="3" fill="currentColor" />
                <path d="M2 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5z" fill="currentColor" />
                <circle cx="14.5" cy="8" r="2.2" fill="currentColor" opacity=".6" />
              </svg>
              <span class="label">Logins</span>
            </a>
          }
        </nav>

        <div class="who">
          <span class="whoami">
            <span class="avatar">{{ initial() }}</span>
            <span class="whotext">
              {{ auth.name() }}
              <em [class.viewer]="!auth.isAdmin()">{{ auth.roleLabel() }}</em>
              @if (auth.lastLoginLabel(); as seen) {
                <em class="seen">
                  Last used {{ seen }}@if (auth.lastLoginBy(); as who) { · {{ who }}}
                </em>
              }
            </span>
          </span>
          <button type="button" class="out" title="Sign out" (click)="signOut()">
            <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
              <path d="M8 3H4v14h4M13 7l3 3-3 3M16 10H8" fill="none" stroke="currentColor"
                    stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="label">Sign out</span>
          </button>
        </div>
      </aside>

      <main><router-outlet /></main>
    </div>
  `,
  styles: [
    `
      @use '../../styles/variables' as *;

      // The sidebar width is one number, so narrowing it moves the whole
      // layout in one step and every screen simply gets wider.
      .shell {
        --side: 236px;

        min-height: 100dvh;
        display: grid;
        grid-template-columns: var(--side) minmax(0, 1fr);
        background: $bg;
        transition: grid-template-columns $speed $ease;
      }

      .shell.rail {
        --side: 74px;
      }

      .side {
        display: flex;
        flex-direction: column;
        gap: 22px;
        background:
          radial-gradient(460px 280px at 100% 0%, rgba(230, 162, 51, 0.14), transparent 66%),
          radial-gradient(380px 320px at 0% 100%, rgba(53, 114, 196, 0.22), transparent 62%),
          #101d30;
        padding: 18px 14px;
        position: sticky;
        top: 0;
        height: 100dvh;
        border-right: 1px solid rgba(255, 255, 255, 0.07);
        overflow: hidden;
      }

      .side-top {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 34px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 11px;
        text-decoration: none;
        min-width: 0;
        flex: 1;

        img {
          object-fit: contain;
          flex: none;
        }

        span {
          display: flex;
          flex-direction: column;
          line-height: 1.25;
          min-width: 0;
        }

        strong {
          font-family: $font-heading;
          font-size: 15px;
          font-weight: 600;
          color: $gold;
          white-space: nowrap;
        }

        small {
          font-size: 11.5px;
          color: $muted-light;
          white-space: nowrap;
        }
      }

      // The narrow / wide switch. Lives next to the logo so it is always
      // in the same place whichever width you are in.
      .pin {
        flex: none;
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 9px;
        border: 1px solid $line-dark;
        background: transparent;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: background $speed $ease, color $speed $ease, transform $speed $ease;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
      }

      .shut {
        display: none;
        flex: none;
        width: 30px;
        height: 30px;
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.7);
        font-size: 22px;
        line-height: 1;
        border-radius: 9px;
        cursor: pointer;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      }

      // Scoped to .side on purpose: pages have <nav> elements of their own,
      // and none of this should reach them.
      .side nav {
        display: flex;
        flex-direction: column;
        gap: 3px;
        flex: 1;
        min-height: 0;
        overflow-y: auto;

        a {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14.5px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.72);
          text-decoration: none;
          padding: 11px 13px;
          border-radius: $radius-sm;
          white-space: nowrap;
          transition: background $speed $ease, color $speed $ease;

          svg {
            width: 18px;
            height: 18px;
            flex: none;
            opacity: 0.85;
          }

          // The gold bar that marks the screen you are on. It lives on the
          // link at zero width and grows into place, so moving between
          // screens slides rather than blinks.
          &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 3px;
            height: 0;
            border-radius: 0 3px 3px 0;
            background: $grad-gold;
            transition: height $speed $ease;
          }

          &:hover {
            background: rgba(255, 255, 255, 0.08);
            color: #fff;

            .dot {
              transform: scale(1.3);
            }
          }

          &.on {
            background: linear-gradient(
              90deg,
              rgba(230, 162, 51, 0.2) 0%,
              rgba(230, 162, 51, 0.06) 100%
            );
            color: $gold;
            font-weight: 600;

            &::before {
              height: 20px;
            }

            svg {
              opacity: 1;
            }

            .dot {
              box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.09);
            }
          }
        }
      }

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex: none;
        transition: transform $speed $ease, box-shadow $speed $ease;
      }

      .d-navy {
        background: $navy-bright;
      }

      .d-vacant {
        background: $vacant;
      }

      .d-green {
        background: #2bb583;
      }

      .d-red {
        background: #e35349;
      }

      .d-gold {
        background: $gold;
      }

      .d-hall {
        background: #a78bfa;
      }

      /*
       * The role was a badge that never changed and never needed acting on.
       * What is worth a glance every morning is when this account was last
       * used — if that is not when you last used it, something is wrong.
       */
      .seen-card {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 5px 11px 5px 9px;
        border-radius: 999px;
        color: rgba(255, 255, 255, 0.82);
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.11);
        white-space: nowrap;

        svg {
          flex: none;
          color: $gold;
        }
      }

      .seen-text {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
      }

      .seen-text em {
        font-style: normal;
        font-size: 9px;
        font-weight: 600;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.45);
      }

      .seen-text b {
        font-size: 11.5px;
        font-weight: 600;
      }

      .whotext .seen {
        color: rgba(255, 255, 255, 0.5);
        font-size: 10.5px;
        font-weight: 500;
        letter-spacing: 0;
        text-transform: none;
      }

      .who {
        border-top: 1px solid $line-dark;
        padding-top: 14px;
        display: flex;
        flex-direction: column;
        gap: 9px;

        .whoami {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .avatar {
          flex: none;
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: $grad-gold;
          color: #2c1c00;
          font-family: $font-heading;
          font-size: 13px;
          font-weight: 700;
        }

        .whotext {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
          font-size: 12.5px;
          color: $muted-light;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        em {
          font-style: normal;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: $gold;

          &.viewer {
            color: rgba(255, 255, 255, 0.45);
          }
        }

        .out {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: $font-body;
          font-size: 13.5px;
          font-weight: 600;
          color: #fff;
          background: transparent;
          border: 1px solid $line-dark;
          border-radius: $radius-sm;
          padding: 9px;
          cursor: pointer;
          white-space: nowrap;
          transition: background $speed $ease, border-color $speed $ease;

          &:hover {
            background: rgba(255, 255, 255, 0.09);
            border-color: rgba(255, 255, 255, 0.24);
          }
        }
      }

      // ---- Narrowed: icons only, and the arrow flips ----
      .rail {
        .side {
          padding: 18px 10px;
          align-items: center;
        }

        .brand span,
        .label,
        .whotext {
          display: none;
        }

        .brand {
          justify-content: center;
        }

        .side-top {
          flex-direction: column;
          gap: 10px;
        }

        .pin svg {
          transform: rotate(180deg);
        }

        .side nav {
          width: 100%;

          a {
            justify-content: center;
            padding: 12px 0;
            gap: 0;
          }

          .dot {
            position: absolute;
            top: 7px;
            right: 9px;
            width: 6px;
            height: 6px;
          }
        }

        .who {
          width: 100%;
          align-items: center;

          .avatar {
            margin: 0 auto;
          }

          .out {
            width: 100%;
          }
        }
      }

      main {
        min-width: 0;
      }

      // ---- Mobile bar + drawer ----
      .topbar,
      .scrim {
        display: none;
      }

      @media (max-width: 900px) {
        .shell,
        .shell.rail {
          --side: 0px;
          grid-template-columns: minmax(0, 1fr);
          grid-template-rows: auto minmax(0, 1fr);
        }

        .topbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 11px;
          position: sticky;
          top: 0;
          z-index: 40;
          // Nearly opaque rather than a heavy blur: a blurred sticky bar is
          // re-composited over the whole page on every scroll frame, which
          // is the difference between a phone scrolling smoothly and not.
          background: rgba(16, 29, 48, 0.97);
          backdrop-filter: blur(6px);
          padding: 8px 14px;
          padding-top: max(8px, env(safe-area-inset-top));
          padding-left: max(14px, env(safe-area-inset-left));
          padding-right: max(14px, env(safe-area-inset-right));
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);

          strong {
            font-family: $font-heading;
            font-size: 14.5px;
            font-weight: 600;
            color: $gold;
            // The role chip beside it must never be pushed off the bar.
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        // On a narrow phone the card drops to its own line rather than
        // squeezing the name beside it.
        @media (max-width: 430px) {
          .seen-card {
            margin-left: 0;
            flex-basis: 100%;
            justify-content: flex-start;
          }
        }

        // 44px square: the one control on the bar that has to be hit
        // first time, every time.
        .burger {
          display: grid;
          align-content: center;
          gap: 4px;
          width: 44px;
          height: 44px;
          margin-left: -5px;
          padding: 0 10px;
          border: none;
          border-radius: $radius-xs;
          background: transparent;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;

          span {
            height: 2px;
            border-radius: 2px;
            background: rgba(255, 255, 255, 0.85);
          }

          &:active {
            background: rgba(255, 255, 255, 0.1);
          }
        }

        // The drawer sits over the page rather than squeezing it.
        .side {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 60;
          width: min(84vw, 288px);
          height: 100dvh;
          padding: 18px 14px calc(18px + env(safe-area-inset-bottom));
          padding-top: max(18px, env(safe-area-inset-top));
          transform: translateX(-100%);
          // Only the transform moves, so the drawer slides on the compositor
          // instead of being laid out again on every frame.
          transition: transform $speed $ease;
          will-change: transform;
          box-shadow: $shadow-lg;
          // The links scroll inside the drawer without handing the gesture
          // to the page behind it.
          overscroll-behavior: contain;
        }

        // A finger on a link needs more room than a cursor does.
        .side nav a {
          padding: 13px 13px;
        }

        .who .out {
          padding: 12px;
        }

        .rail .side {
          padding: 18px 14px calc(18px + env(safe-area-inset-bottom));
          padding-top: max(18px, env(safe-area-inset-top));
          align-items: stretch;
        }

        // Inside the drawer the full labels always come back.
        .rail .brand span,
        .rail .label,
        .rail .whotext {
          display: flex;
        }

        .rail .side-top {
          flex-direction: row;
        }

        .rail .side nav a {
          justify-content: flex-start;
          padding: 13px 13px;
          gap: 10px;
        }

        .rail .side nav .dot {
          position: static;
          width: 8px;
          height: 8px;
        }

        .open .side {
          transform: none;
        }

        // No blur on this one: it covers the whole viewport, and a
        // full-screen backdrop filter is the most expensive thing a phone
        // can be asked to paint while something else is animating over it.
        .open .scrim {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(12, 17, 30, 0.55);
          animation: scrim-in $speed $ease both;
        }

        .pin {
          display: none;
        }

        .shut {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          font-size: 26px;
        }
      }

      @keyframes scrim-in {
        from {
          opacity: 0;
        }
      }
    `
  ]
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Narrowed to icons only. Remembered, so it survives a reload. */
  readonly rail = signal(read(RAIL_KEY) === '1');

  /** Only used below 900px, where the sidebar slides over the page. */
  readonly drawer = signal(false);

  constructor() {
    // Any navigation closes the drawer, including the browser back button.
    // The lock is dropped here rather than by the effect below, because the
    // router is already taking the new screen to the top and the old screen's
    // scroll position must not be put back over it.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.drawer()) {
          this.drawer.set(false);
          lockScroll(this, false, false);
        }
      });

    effect(() => write(RAIL_KEY, this.rail() ? '1' : '0'));

    // While the drawer is over the page, the page holds still. Otherwise a
    // swipe meant for the menu scrolls the screen behind it, and closing the
    // drawer leaves you somewhere you did not choose to be.
    effect(() => lockScroll(this, this.drawer()));
  }

  initial(): string {
    return (this.auth.name() ?? '?').trim().charAt(0).toUpperCase() || '?';
  }

  toggleRail(): void {
    this.rail.update((v) => !v);
  }

  signOut(): void {
    this.auth.signOut();
    this.router.navigate(['/login']);
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing can block storage; the signal still holds the choice.
  }
}
