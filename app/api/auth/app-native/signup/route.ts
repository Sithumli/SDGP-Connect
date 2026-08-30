// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextResponse } from "next/server";
import * as z from "zod";

import { createSignedBlob } from "@/lib/auth/asgardeo";
import { asgardeoAccountExists } from "@/lib/auth/asgardeoScim";
import { APP_NATIVE_COOKIE_OPTIONS } from "@/lib/auth/appNativeCookies";
import { DOMAIN_REJECTED_MESSAGE, isAllowedEmail } from "@/lib/auth/emailDomain";
import {
  SIGNUP_VERIFICATION_COOKIE,
  SIGNUP_VERIFICATION_TTL_MS,
  createVerificationCode,
  hashVerificationCode,
} from "@/lib/auth/signupVerification";
import { sendEmail } from "@/lib/email";
import { verificationEmailTemplate } from "@/lib/email/templates/verification";
import { apiErrorResponse } from "@/lib/api-error";
import { SIGNUP_RATE_LIMIT_RULES, enforceRateLimit } from "@/lib/auth/authRateLimit";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const VERIFICATION_SENT = {
  verificationRequired: true,
  message: "We've emailed you a 6-digit code. Enter it to finish creating your account.",
};

export async function POST(req: Request) {
  try {
    const limited = await enforceRateLimit(req, SIGNUP_RATE_LIMIT_RULES);
    if (limited) return limited;

    const body = await req.json();
    const validationResult = signupSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message ?? "Invalid details" },
        { status: 400 },
      );
    }

    const { name, email } = validationResult.data;

    if (!isAllowedEmail(email)) {
      return NextResponse.json({ error: DOMAIN_REJECTED_MESSAGE }, { status: 403 });
    }

    if (await asgardeoAccountExists(email)) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 },
      );
    }

    // Nothing is created yet. Creating an account here — even a locked one — would let anyone
    // squat on a colleague's address and lock them out of the platform until an admin intervened.
    // The account is created in the verify step, once the code proves control of the mailbox.
    const otp = createVerificationCode();

    await sendEmail({
      to: email,
      subject: "Confirm your SDGP.lk email address",
      html: verificationEmailTemplate(name, otp),
    });

    const response = NextResponse.json(VERIFICATION_SENT);

    response.cookies.set({
      name: SIGNUP_VERIFICATION_COOKIE,
      value: createSignedBlob(
        { email: email.trim().toLowerCase(), otpHash: hashVerificationCode(email, otp) },
        SIGNUP_VERIFICATION_TTL_MS,
      ),
      ...APP_NATIVE_COOKIE_OPTIONS,
      maxAge: SIGNUP_VERIFICATION_TTL_MS / 1000,
    });

    return response;
  } catch (error) {
    return apiErrorResponse("Error during app-native signup", error, "Sign-up failed. Please try again.");
  }
}
