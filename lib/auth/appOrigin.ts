// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

const normalizeOrigin = (value: string) => value.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");

/**
 * Origins this app is served from. The site answers on more than one hostname, and the OAuth
 * redirect_uri has to match the host the visitor is actually on — otherwise Google sends them back
 * to the other domain, where the flow-state cookie does not exist.
 */
export const ALLOWED_APP_ORIGINS = (process.env.APP_ALLOWED_ORIGINS ?? process.env.NEXTAUTH_URL ?? "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

/** Origin of the incoming request, read from the proxy headers Vercel sets. */
export const getRequestOrigin = (req: Request): string | null => {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return null;

  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return normalizeOrigin(`${proto}://${host}`);
};

/**
 * The origin to build this request's redirect_uri from.
 *
 * Host headers are attacker-controlled, so an unrecognised origin falls back to the first
 * configured one rather than being trusted — that keeps a forged Host from steering the OAuth
 * callback at another site.
 */
export const resolveAppOrigin = (req?: Request): string => {
  const fallback = ALLOWED_APP_ORIGINS[0] ?? "";
  if (!req) return fallback;

  const origin = getRequestOrigin(req);
  if (origin && ALLOWED_APP_ORIGINS.includes(origin)) return origin;

  if (origin) {
    console.warn(`Request origin "${origin}" is not in APP_ALLOWED_ORIGINS; using "${fallback}".`);
  }

  return fallback;
};
