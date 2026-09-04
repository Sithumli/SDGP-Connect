// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

const isDev = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "img-src 'self' data: blob: https:",
  // 'unsafe-inline'/'unsafe-eval' are still required by the Next.js runtime; removing them needs
  // per-request nonces, which is a larger change than this pass.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://api.psycodelabs.lk https://*.psycodelabs.lk${isDev ? " http://localhost:3001" : ""}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.psycodelabs.lk${isDev ? " http://localhost:3001" : ""}`,
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' https://api.psycodelabs.lk https://*.psycodelabs.lk wss://api.psycodelabs.lk wss://*.psycodelabs.lk${isDev ? " http://localhost:3001 ws://localhost:3001" : ""}`,
  "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://vimeo.com https://api.psycodelabs.lk https://*.psycodelabs.lk",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
  "report-uri /api/security/csp-report",
  "report-to csp-endpoint",
].join("; ");

/**
 * Single source of truth for the security headers.
 *
 * next.config's headers() decorates normal responses but not the redirects Next generates
 * internally, so middleware applies the same set to everything it returns.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": contentSecurityPolicy,
  "Reporting-Endpoints": 'csp-endpoint="/api/security/csp-report"',
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), interest-cohort=()",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "off",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export const SECURITY_HEADER_ENTRIES = Object.entries(SECURITY_HEADERS).map(([key, value]) => ({
  key,
  value,
}));
