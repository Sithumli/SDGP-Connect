// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { verifySignedBlob } from "@/lib/auth/asgardeo";
import { createAsgardeoUser } from "@/lib/auth/asgardeoScim";
import { isAllowedEmail } from "@/lib/auth/emailDomain";
import {
  SIGNUP_VERIFICATION_COOKIE,
  type SignupVerificationState,
  verificationCodeMatches,
} from "@/lib/auth/signupVerification";
import { apiErrorResponse } from "@/lib/api-error";
import { RESET_VERIFY_RATE_LIMIT_RULES, enforceRateLimit } from "@/lib/auth/authRateLimit";

const verifySchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** Confirms the emailed code, then creates the account it belongs to. */
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(
      req,
      RESET_VERIFY_RATE_LIMIT_RULES,
      "Too many incorrect codes. Please wait before trying again.",
    );
    if (limited) return limited;

    const body = await req.json();
    const validationResult = verifySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message ?? "Enter the 6-digit code" },
        { status: 400 },
      );
    }

    const cookie = req.cookies.get(SIGNUP_VERIFICATION_COOKIE)?.value;
    const state = cookie ? verifySignedBlob<SignupVerificationState & { expiresAt: number }>(cookie) : null;

    if (!state) {
      return NextResponse.json(
        { error: "Your sign-up session expired. Please start again." },
        { status: 410 },
      );
    }

    const { otp, name, password } = validationResult.data;

    if (!verificationCodeMatches(state.email, otp, state.otpHash)) {
      return NextResponse.json(
        { error: "That code is incorrect or has expired. Please check your email." },
        { status: 401 },
      );
    }

    // The cookie is server-signed, but the domain rule is re-applied wherever an account is made.
    // The address comes from the cookie, never from the request body, so a valid code can only
    // ever create the account it was emailed to.
    if (!isAllowedEmail(state.email)) {
      return NextResponse.json({ error: "This email address is not allowed." }, { status: 403 });
    }

    const [givenName, ...rest] = name.trim().split(/\s+/);
    const created = await createAsgardeoUser(
      state.email,
      password,
      givenName,
      rest.join(" ") || givenName,
    );

    if (!created.ok) {
      return NextResponse.json(
        { error: created.message ?? "Could not create your account. Please try again." },
        { status: created.status === 409 ? 409 : 400 },
      );
    }

    const response = NextResponse.json({ verified: true, email: state.email });
    response.cookies.delete(SIGNUP_VERIFICATION_COOKIE);
    return response;
  } catch (error) {
    return apiErrorResponse("Error verifying sign-up code", error, "Could not verify that code.");
  }
}
