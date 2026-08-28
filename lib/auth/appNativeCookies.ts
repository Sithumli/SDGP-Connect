// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

export const GOOGLE_FLOW_COOKIE = "sdgp.app-native.google";
export const TICKET_COOKIE = "sdgp.app-native.ticket";
export const RECOVERY_FLOW_COOKIE = "sdgp.app-native.recovery";

/** Recovery spans an email round-trip, so it outlives the short-lived sign-in cookies. */
export const RECOVERY_COOKIE_MAX_AGE = 60 * 60;

export const APP_NATIVE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 600,
} as const;
