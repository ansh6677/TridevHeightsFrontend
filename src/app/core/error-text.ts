import { HttpErrorResponse } from '@angular/common/http';

/** Pulls the server's message out, or falls back to something a person can act on. */
export function errorText(e: unknown, fallback = 'Something went wrong. Try again.'): string {
  const err = e as HttpErrorResponse;
  if (err?.status === 0) {
    return 'Could not reach the server. Is the backend running?';
  }
  const message = err?.error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}
