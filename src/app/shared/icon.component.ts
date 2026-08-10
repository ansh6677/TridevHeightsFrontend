import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * The console's icon set — one stroked family, 24px grid, 1.75 weight, so
 * every glyph on the screen looks like it was drawn by the same hand.
 *
 * Each case carries its own complete <svg> root rather than sharing one
 * wrapper: that keeps the SVG namespace unambiguous inside the control-flow
 * blocks, and it costs nothing at runtime because only one case renders.
 *
 *   <th-icon name="download" />
 *
 * Colour comes from `currentColor`, size from the `.ic` class (a button
 * sizes it, a pane head sizes it), so a button never has to know which
 * icon it holds.
 */
@Component({
  selector: 'th-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (name) {
      @case ('download') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v11m0 0 4-4m-4 4-4-4" />
          <path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16" />
        </svg>
      }
      @case ('plus') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      }
      @case ('refresh') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 12a8 8 0 1 1-2.4-5.7" />
          <path d="M20 4v4.5h-4.5" />
        </svg>
      }
      @case ('search') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-3.6-3.6" />
        </svg>
      }
      @case ('close') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      }
      @case ('check') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7" />
        </svg>
      }
      @case ('bell') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 9a6 6 0 1 0-12 0c0 4-1.5 5.5-2 6.5h16c-.5-1-2-2.5-2-6.5Z" />
          <path d="M10 19a2.2 2.2 0 0 0 4 0" />
        </svg>
      }
      @case ('mail') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4 7.5 7.1 5a1.6 1.6 0 0 0 1.8 0l7.1-5" />
        </svg>
      }
      @case ('receipt') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8Z" />
          <path d="M9.5 8.5h5M9.5 12h5" />
        </svg>
      }
      @case ('wallet') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="6" width="18" height="14" rx="3" />
          <path d="M3 10h18" />
          <circle cx="16.5" cy="15" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      }
      @case ('building') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 21V5.5L11 3v18" />
          <path d="M11 9.5 20 12v9" />
          <path d="M7 8h1M7 12h1M7 16h1M15 15h1" />
          <path d="M3 21h18" />
        </svg>
      }
      @case ('grid') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="3.5" width="7" height="5" rx="2" />
          <rect x="13.5" y="11.5" width="7" height="9" rx="2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
        </svg>
      }
      @case ('users') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8" r="3.4" />
          <path d="M3 20c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6" />
          <path d="M16.5 11.4a3 3 0 0 0 0-6M18 19.8c0-2.2-.7-3.7-1.8-4.6" />
        </svg>
      }
      @case ('user') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.6" />
          <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
        </svg>
      }
      @case ('trend-up') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 15.5 9.5 10l3.5 3.5L20 6.5" />
          <path d="M15 6.5h5v5" />
        </svg>
      }
      @case ('chart') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20V4" />
          <path d="M4 20h16" />
          <rect x="7.5" y="11" width="3.2" height="6" rx="1.2" />
          <rect x="13.5" y="7" width="3.2" height="10" rx="1.2" />
        </svg>
      }
      @case ('calendar') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="16" rx="3" />
          <path d="M3.5 10h17M8 3.5v3M16 3.5v3" />
        </svg>
      }
      @case ('undo') {
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7v6h6" />
          <path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
        </svg>
      }
      @case ('clock') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 1.8" />
        </svg>
      }
      @case ('phone') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6.5 3.5h2l1.4 3.5-1.7 1.3a11 11 0 0 0 5.5 5.5l1.3-1.7 3.5 1.4v2A2.5 2.5 0 0 1 16 18C10 17.4 6.6 14 5.6 8A2.5 2.5 0 0 1 6.5 3.5Z"
          />
        </svg>
      }
      @case ('bed') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 18v-9M3 13h18v5M21 18v-4a3 3 0 0 0-3-3h-7v2" />
          <circle cx="7" cy="10" r="2" />
        </svg>
      }
      @case ('key') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="8" cy="16" r="3.5" />
          <path d="m10.6 13.4 8-8M17 7l2 2M15 9l2 2" />
        </svg>
      }
      @case ('logout') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
          <path d="m16 8 4 4-4 4M20 12H10" />
        </svg>
      }
      @case ('filter') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5.5h16l-6.2 7.2V19l-3.6-2v-4.3Z" />
        </svg>
      }
      @case ('edit') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20h4L19 9a2.4 2.4 0 0 0-3.4-3.4L4.5 16.7Z" />
          <path d="m14.5 7 2.5 2.5" />
        </svg>
      }
      @case ('trash') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.5 6.5h15M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
          <path d="M6.5 6.5 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12.5" />
        </svg>
      }
      @case ('chevron-down') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9.5 6 6 6-6" />
        </svg>
      }
      @case ('arrow-down') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4.5v15m0 0 5.5-5.5M12 19.5 6.5 14" />
        </svg>
      }
      @case ('arrow-right') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.5 12h15m0 0-5.5-5.5M19.5 12 14 17.5" />
        </svg>
      }
      @case ('minus') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      }
      @case ('rupee') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.5h10M7 9h10M16 4.5c0 3-2 4.5-5 4.5H7l8 10" />
        </svg>
      }
      @case ('sparkle') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.5 13.9 9l5.6 2-5.6 2-1.9 5.5L10.1 13 4.5 11l5.6-2Z" />
        </svg>
      }
      @case ('inbox') {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3.5 13.5h4l1.5 3h6l1.5-3h4" />
          <path d="M5.6 4.5h12.8l2.1 9v4a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2v-4Z" />
        </svg>
      }
      @default {
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
        </svg>
      }
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex: none;
        line-height: 0;
      }

      // The host shrink-wraps the glyph, so whoever holds the icon sets the
      // size by styling .ic — a button, a pane head, a pill — and never has
      // to know which icon it is holding.
      svg {
        width: 18px;
        height: 18px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.75;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    `
  ]
})
export class IconComponent {
  /** Which glyph. An unknown name draws a plain circle rather than nothing. */
  @Input({ required: true }) name = '';
}
