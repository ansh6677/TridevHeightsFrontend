/**
 * Holds the page still while a sheet or the drawer is over it.
 *
 * Without this, a swipe on a phone scrolls whatever is behind the sheet:
 * you close the tenant form and the list has moved half a screen, or the
 * gesture is shared between the sheet and the page and neither moves
 * properly. `overflow: hidden` on the body is not enough on iOS — only a
 * fixed body actually stops — so the scroll position is stored here and put
 * back the moment the last holder lets go.
 *
 * Reference counted by owner, because two things can be open at once: the
 * drawer over a page that already has a sheet up.
 */
const holders = new Set<object>();

/** Where the page was before it was frozen. */
let restoreTo = 0;

/**
 * @param owner  Whoever is holding the page still — pass `this`.
 * @param on     True to hold, false to let go.
 * @param restore Put the page back where it was on the last release. Pass
 *   false when the release comes with a navigation: the router is already
 *   taking the new screen to the top, and restoring would fight it.
 */
export function lockScroll(owner: object, on: boolean, restore = true): void {
  const wasLocked = holders.size > 0;

  if (on) {
    holders.add(owner);
  } else {
    holders.delete(owner);
  }

  const isLocked = holders.size > 0;
  if (wasLocked === isLocked) {
    return;
  }

  const body = document.body;

  if (isLocked) {
    restoreTo = window.scrollY;
    body.style.top = `-${restoreTo}px`;
    body.classList.add('locked');
  } else {
    body.classList.remove('locked');
    body.style.top = '';
    if (restore) {
      // 'auto' on purpose: html has scroll-behavior: smooth, and putting the
      // page back should be invisible rather than a scroll the eye can follow.
      window.scrollTo({ top: restoreTo, behavior: 'auto' });
    }
  }
}
