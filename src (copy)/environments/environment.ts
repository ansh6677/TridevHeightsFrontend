/**
 * Single environment file — used by local `ng serve` AND by the Vercel build.
 * There is no environment.prod.ts and no fileReplacements; this is the only one.
 * Backend: Spring Boot on Render, every controller sits under /api.
 */
export const environment = {
  production: true,
  apiBase: 'https://tridevheightsbackend.onrender.com/api'
};
