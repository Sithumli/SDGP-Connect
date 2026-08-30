// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

export function verificationEmailTemplate(name: string, code: string) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#f6f6f7;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;padding:36px;border:1px solid #e7e7ea">
      <h1 style="margin:0 0 12px;font-size:22px;color:#18181b">Confirm your email address</h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#52525b">
        Hi ${name || "there"}, welcome to SDGP.lk. Enter this code to finish creating your account.
      </p>
      <div style="margin:0 0 24px;padding:18px;text-align:center;background:#18181b;border-radius:10px">
        <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:30px;letter-spacing:10px;color:#ffffff">${code}</span>
      </div>
      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#71717a">
        This code expires in 15 minutes. Your account stays locked until it is confirmed.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a">
        If you did not try to sign up for SDGP.lk, you can ignore this email.
      </p>
    </div>
    <p style="max-width:520px;margin:16px auto 0;font-size:11px;color:#a1a1aa;text-align:center">
      © 2026 SDGP.lk · All rights reserved
    </p>
  </div>`;
}
