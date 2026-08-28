// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { verifySignedBlob } from "@/lib/auth/asgardeo";
import { setRecoveredPassword } from "@/lib/auth/asgardeoRecovery";
import { RECOVERY_FLOW_COOKIE } from "@/lib/auth/appNativeCookies";
import { apiErrorResponse } from "@/lib/api-error";
import { RESET_VERIFY_RATE_LIMIT_RULES, enforceRateLimit } from "@/lib/auth/authRateLimit";
import type { RecoveryFlowState } from "@/lib/auth/recoveryFlowState";

const confirmSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** Sets the new password. Only reachable once /verify has put a resetCode in the flow cookie. */
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(req, RESET_VERIFY_RATE_LIMIT_RULES);
    if (limited) return limited;

    const body = await req.json();
    const validationResult = confirmSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message ?? "Invalid password" },
        { status: 400 },
      );
    }

    const flowCookie = req.cookies.get(RECOVERY_FLOW_COOKIE)?.value;
    const flowState = flowCookie ? verifySignedBlob<RecoveryFlowState>(flowCookie) : null;

    if (!flowState?.resetCode) {
      return NextResponse.json(
        { error: "Your reset session expired. Please request a new code." },
        { status: 410 },
      );
    }

    const result = await setRecoveredPassword(
      flowState.resetCode,
      flowState.flowConfirmationCode,
      validationResult.data.password,
      flowState.email,
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    const response = NextResponse.json({ message: "Your password has been reset." });
    response.cookies.delete(RECOVERY_FLOW_COOKIE);
    return response;
  } catch (error) {
    return apiErrorResponse(
      "Error confirming password reset",
      error,
      "Could not reset your password. Please try again.",
    );
  }
}
