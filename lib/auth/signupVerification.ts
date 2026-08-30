// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import crypto from "crypto";

export const SIGNUP_VERIFICATION_COOKIE = "sdgp.app-native.signup";
export const SIGNUP_VERIFICATION_TTL_MS = 15 * 60 * 1000;

export interface SignupVerificationState {
  email: string;
  /** The code is stored hashed, so a leaked cookie does not hand over the code itself. */
  otpHash: string;
  expiresAt: number;
}

export const createVerificationCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

export const hashVerificationCode = (email: string, otp: string) =>
  crypto
    .createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "")
    .update(`${email.trim().toLowerCase()}:${otp}`)
    .digest("hex");

export const verificationCodeMatches = (email: string, otp: string, otpHash: string) => {
  const expected = Buffer.from(hashVerificationCode(email, otp));
  const provided = Buffer.from(otpHash);

  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
};
