// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { createSignedBlob, verifySignedBlob } from "@/lib/auth/asgardeo";
import { confirmRecoveryCode } from "@/lib/auth/asgardeoRecovery";
import {
  APP_NATIVE_COOKIE_OPTIONS,
  RECOVERY_COOKIE_MAX_AGE,
  RECOVERY_FLOW_COOKIE,
} from "@/lib/auth/appNativeCookies";
import { apiErrorResponse } from "@/lib/api-error";
import { enforceRateLimit, enforceSameOrigin, RESET_VERIFY_RATE_LIMIT_RULES } from "@/lib/auth/authRateLimit";
import type { RecoveryFlowState } from "@/lib/auth/recoveryFlowState";

const verifySchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

/** Checks the emailed code so the user is only asked for a new password once it is known good. */
export async function POST(req: NextRequest) {
  try {
    const crossOrigin = enforceSameOrigin(req);
    if (crossOrigin) return crossOrigin;

    const limited = await enforceRateLimit(req, RESET_VERIFY_RATE_LIMIT_RULES, "Too many incorrect codes. Please wait before trying again.");
    if (limited) return limited;

    const body = await req.json();
    const validationResult = verifySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message ?? "Enter the 6-digit code" },
        { status: 400 },
      );
    }

    const flowCookie = req.cookies.get(RECOVERY_FLOW_COOKIE)?.value;
    const flowState = flowCookie ? verifySignedBlob<RecoveryFlowState>(flowCookie) : null;

    if (!flowState) {
      return NextResponse.json(
        { error: "Your reset session expired. Please request a new code." },
        { status: 410 },
      );
    }

    const confirmed = await confirmRecoveryCode(flowState.flowConfirmationCode, validationResult.data.otp);

    if (!confirmed.ok) {
      return NextResponse.json({ error: confirmed.message }, { status: 401 });
    }

    const response = NextResponse.json({ verified: true });

    response.cookies.set({
      name: RECOVERY_FLOW_COOKIE,
      value: createSignedBlob({ ...flowState, resetCode: confirmed.resetCode }),
      ...APP_NATIVE_COOKIE_OPTIONS,
      maxAge: RECOVERY_COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    return apiErrorResponse("Error verifying reset code", error, "Could not verify that code.");
  }
}
