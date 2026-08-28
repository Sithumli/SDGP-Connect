// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextResponse } from "next/server";

import { checkRateLimit, type RateLimitRule } from "@/lib/rateLimit";

export const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
};

/** Password guessing against Asgardeo. */
export const LOGIN_RATE_LIMIT_RULES: RateLimitRule[] = [
  { name: "auth-login-burst", windowSeconds: 60, max: 10 },
  { name: "auth-login-hour", windowSeconds: 3600, max: 60 },
];

/** Account creation, and the SCIM writes behind it. */
export const SIGNUP_RATE_LIMIT_RULES: RateLimitRule[] = [
  { name: "auth-signup-burst", windowSeconds: 300, max: 5 },
  { name: "auth-signup-day", windowSeconds: 86400, max: 20 },
];

/** Recovery emails, so the form cannot be used to mail-bomb an address. */
export const RESET_REQUEST_RATE_LIMIT_RULES: RateLimitRule[] = [
  { name: "auth-reset-req-burst", windowSeconds: 300, max: 3 },
  { name: "auth-reset-req-hour", windowSeconds: 3600, max: 10 },
];

/**
 * The tightest limit of the set: a 6-digit OTP is only 10^6 wide, and anyone can start a recovery
 * for someone else's address, so unbounded guessing would be an account takeover.
 */
export const RESET_VERIFY_RATE_LIMIT_RULES: RateLimitRule[] = [
  { name: "auth-reset-verify-burst", windowSeconds: 300, max: 5 },
  { name: "auth-reset-verify-hour", windowSeconds: 3600, max: 15 },
];

/** Starting an Asgardeo flow costs an upstream request, so cap how fast it can be driven. */
export const FLOW_START_RATE_LIMIT_RULES: RateLimitRule[] = [
  { name: "auth-flow-start-burst", windowSeconds: 60, max: 15 },
  { name: "auth-flow-start-hour", windowSeconds: 3600, max: 100 },
];

/** Returns a 429 response when the caller is over the limit, or null to continue. */
export const enforceRateLimit = async (
  req: Request,
  rules: RateLimitRule[],
  message = "Too many attempts. Please wait a moment and try again.",
): Promise<NextResponse | null> => {
  const result = await checkRateLimit(getClientIp(req), rules);
  if (result.ok) return null;

  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
};
