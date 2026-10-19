import { CookieOptions, Response } from 'express';

/**
 * Secure Cookie Options compliant with cGMP / FDA 21 CFR Part 11 guidelines:
 * - HttpOnly: Inaccessible to client-side scripts, preventing XSS token harvesting
 * - SameSite: 'Strict' ensures cookies are never sent in cross-site requests (CSRF mitigation)
 * - Secure: Sent exclusively over TLS/HTTPS in production environments
 * - Path: '/' covers all authorized LIMS API routes
 */
export const getSecureCookieOptions = (maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
};

/**
 * Sets secure authentication tokens as HttpOnly cookies on response
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken?: string,
): void {
  if (!res || typeof res.cookie !== 'function') return;

  // 15 minutes access token cookie
  res.cookie('access_token', accessToken, getSecureCookieOptions(15 * 60 * 1000));

  // 7 days refresh token cookie
  if (refreshToken) {
    res.cookie('refresh_token', refreshToken, getSecureCookieOptions(7 * 24 * 60 * 60 * 1000));
  }
}

/**
 * Clears authentication cookies upon logout or session invalidation
 */
export function clearAuthCookies(res: Response): void {
  if (!res || typeof res.clearCookie !== 'function') return;

  const options = getSecureCookieOptions(0);
  res.clearCookie('access_token', options);
  res.clearCookie('refresh_token', options);
}
