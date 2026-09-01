// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextResponse } from "next/server";
import * as z from "zod";

import { createSignedBlob } from "@/lib/auth/asgardeo";
import { requestPasswordRecovery } from "@/lib/auth/asgardeoRecovery";
import {
  APP_NATIVE_COOKIE_OPTIONS,
  RECOVERY_COOKIE_MAX_AGE,
  RECOVERY_FLOW_COOKIE,
} from "@/lib/auth/appNativeCookies";
import { DOMAIN_REJECTED_MESSAGE, isAllowedEmail } from "@/lib/auth/emailDomain";
import { apiErrorResponse } from "@/lib/api-error";
import { enforceRateLimit, enforceSameOrigin, RESET_REQUEST_RATE_LIMIT_RULES } from "@/lib/auth/authRateLimit";

const requestSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export async function POST(req: Request) {
  try {
    const crossOrigin = enforceSameOrigin(req);
    if (crossOrigin) return crossOrigin;

    const limited = await enforceRateLimit(req, RESET_REQUEST_RATE_LIMIT_RULES);
    if (limited) return limited;

    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    const { email } = validationResult.data;

    if (!isAllowedEmail(email)) {
      return NextResponse.json({ error: DOMAIN_REJECTED_MESSAGE }, { status: 403 });
    }

    const initiation = await requestPasswordRecovery(email);

    // Always the same answer, whether or not the account exists, so this cannot enumerate users.
    const response = NextResponse.json({
      message: "If an account exists for that email, a reset link is on its way.",
    });

    if (initiation) {
      response.cookies.set({
        name: RECOVERY_FLOW_COOKIE,
        value: createSignedBlob({ flowConfirmationCode: initiation.flowConfirmationCode, email }),
        ...APP_NATIVE_COOKIE_OPTIONS,
        maxAge: RECOVERY_COOKIE_MAX_AGE,
      });
    }

    return response;
  } catch (error) {
    return apiErrorResponse(
      "Error requesting password reset",
      error,
      "Could not start the reset. Please try again.",
    );
  }
}
