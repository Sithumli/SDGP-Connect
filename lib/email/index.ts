// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.
import nodemailer from "nodemailer";
import { EMAIL_FROM_NAME, emailConfig, otpEmailConfig } from "./config";

/** "otp" uses the dedicated sign-up mailbox; everything else uses the main account. */
export type EmailTransport = "default" | "otp";

export async function sendEmail({
  to,
  subject,
  html,
  transport = "default",
}: {
  to: string;
  subject: string;
  html: string;
  transport?: EmailTransport;
}) {
  const config = transport === "otp" ? otpEmailConfig : emailConfig;
  const transporter = nodemailer.createTransport(config);

  await transporter.sendMail({
    from: { name: EMAIL_FROM_NAME, address: config.auth.user ?? "" },
    to,
    subject,
    html,
  });
}
