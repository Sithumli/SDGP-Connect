// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextRequest, NextResponse } from "next/server";

import { TICKET_COOKIE } from "@/lib/auth/appNativeCookies";

/** Hands the ticket minted by the Google callback to the completion page, then clears the cookie. */
export async function GET(req: NextRequest) {
  const ticket = req.cookies.get(TICKET_COOKIE)?.value;

  const response = ticket
    ? NextResponse.json({ ticket })
    : NextResponse.json({ error: "Your sign-in session expired. Please try again." }, { status: 401 });

  response.cookies.delete(TICKET_COOKIE);
  return response;
}
