// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextResponse, type NextRequest } from "next/server";

import { SECURITY_HEADERS } from "@/lib/securityHeaders";

const withSecurityHeaders = (response: NextResponse) => {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
};

/**
 * Path segments that only ever appear in traversal probes. The `..;` form exists to slip past
 * proxies that strip matrix parameters before normalising the path, and encoded variants cover the
 * same trick after percent-decoding.
 */
const TRAVERSAL_PATTERN = /(^|[/\\])(\.\.|%2e%2e|\.%2e|%2e\.)([;/\\]|$)/i;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const rawPath = req.url.split("?")[0];

  // Answer directly instead of letting Next redirect: a probe that bounces through a 308 both
  // burns the scanner's redirect budget and returns a response with no security headers on it.
  if (TRAVERSAL_PATTERN.test(pathname) || TRAVERSAL_PATTERN.test(rawPath)) {
    return withSecurityHeaders(new NextResponse(null, { status: 404 }));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
