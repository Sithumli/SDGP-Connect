// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

const DEFAULT_CALLBACK_URL = "/dashboard";

/**
 * Constrains a post-sign-in redirect to this site.
 *
 * A leading slash alone is not enough: "//evil.com" and "/\evil.com" are protocol-relative URLs
 * that browsers resolve off-site, so a crafted ?callbackUrl= would send a freshly authenticated
 * user to an attacker's page.
 */
export const safeCallbackUrl = (value: string | null | undefined): string => {
  if (!value) return DEFAULT_CALLBACK_URL;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return DEFAULT_CALLBACK_URL;
  if (/^\/[/\\]/.test(trimmed)) return DEFAULT_CALLBACK_URL;

  return trimmed;
};
