// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { ALLOWED_APP_ORIGINS, getRequestOrigin } from "@/lib/auth/appOrigin";

/**
 * Applies CORS headers for a known origin only.
 *
 * A wildcard 'Access-Control-Allow-Origin' lets any site read the response, so the origin is
 * echoed back only when it is one of ours, and 'Vary: Origin' keeps caches from serving one
 * origin's headers to another.
 */
export function applyCors<T extends { headers: Headers }>(response: T, req: Request): T {
  const origin = getRequestOrigin(req);

  if (origin && ALLOWED_APP_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}
