// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

/** Display name recipients see, rather than the bare mailbox address. */
export const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME?.trim() || "SDGP.LK";

const timeouts = {
  connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10_000),
  greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10_000),
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20_000),
};

export const emailConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  ...timeouts,
};

/**
 * Separate mailbox for sign-up codes.
 *
 * Approval and rejection notices go out on the main account, which has its own provider rate
 * limit. Sharing it would mean a burst of those emails could stop people signing up. Falls back to
 * the main account when the OTP mailbox is not configured.
 */
export const otpEmailConfig = {
  host: process.env.OTP_SMTP_HOST || process.env.SMTP_HOST,
  port: Number(process.env.OTP_SMTP_PORT || process.env.SMTP_PORT) || 587,
  secure: Number(process.env.OTP_SMTP_PORT || process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.OTP_SMTP_USER || process.env.SMTP_USER,
    pass: process.env.OTP_SMTP_PASS || process.env.SMTP_PASS,
  },
  ...timeouts,
};
