// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

export const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN ?? "iit.ac.lk")
  .trim()
  .replace(/^['"]|['"]$/g, "")
  .replace(/^@/, "")
  .toLowerCase();

/**
 * Individual addresses allowed regardless of domain, for administrators who predate the IIT-only
 * rule. Comma separated, e.g. ALLOWED_EMAIL_EXCEPTIONS="admin@gmail.com,ops@example.com".
 */
export const ALLOWED_EMAIL_EXCEPTIONS = (process.env.ALLOWED_EMAIL_EXCEPTIONS ?? "")
  .split(",")
  .map((entry) => entry.trim().replace(/^['"]|['"]$/g, "").toLowerCase())
  .filter(Boolean);

/** True when the address may sign in: either on the allowed domain, or explicitly excepted. */
export const isAllowedEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;

  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  return (
    normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`) || ALLOWED_EMAIL_EXCEPTIONS.includes(normalized)
  );
};

export const DOMAIN_REJECTED_MESSAGE = `Only @${ALLOWED_EMAIL_DOMAIN} email addresses can sign in here.`;
