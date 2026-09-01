// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextResponse } from "next/server";

/**
 * Collector for the CSP 'report-uri' / 'report-to' directives.
 *
 * Browsers post here unauthenticated, so the body is untrusted and only ever logged: a truncated
 * summary rather than the whole payload, to keep a noisy or hostile reporter from flooding the log.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const report =
      (body as { "csp-report"?: Record<string, unknown> })?.["csp-report"] ??
      (Array.isArray(body) ? body[0]?.body : body);

    if (report) {
      const { "document-uri": documentUri, "violated-directive": directive, "blocked-uri": blocked } =
        report as Record<string, string>;

      console.warn(
        `[csp] ${String(directive ?? "unknown").slice(0, 80)} blocked ${String(blocked ?? "-").slice(0, 200)} on ${String(documentUri ?? "-").slice(0, 200)}`,
      );
    }
  } catch {
    // A malformed report must never surface as an error to the browser.
  }

  return new NextResponse(null, { status: 204 });
}
