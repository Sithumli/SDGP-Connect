// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { getAsgardeoBaseUrl } from "@/lib/auth/asgardeo";
import { getM2MAccessToken } from "@/lib/auth/asgardeoM2M";
import { getLastPasswordUpdateTime } from "@/lib/auth/asgardeoScim";

// The Account Recovery API's OpenAPI header lists internal_identity_mgt_* scopes, but Asgardeo
// publishes this API resource with a single scope. Verified against the token endpoint.
const RECOVERY_SCOPES = ["internal_user_recovery_create"];

/**
 * The Console registers this API resource under a /api/users/v1/recovery path, but that path
 * answers PWR-10004 while v2 serves the flow; one resource authorizes both. Verified against the
 * live tenant, so treat the registered path as a label rather than the endpoint to call.
 */
const getRecoveryApiVersion = () =>
  process.env.ASGARDEO_RECOVERY_API_VERSION?.trim().replace(/^['"]|['"]$/g, "") || "v2";

const getRecoveryBaseUrl = () => `${getAsgardeoBaseUrl()}/api/users/${getRecoveryApiVersion()}`;

const recoveryRequest = async (path: string, body: Record<string, unknown>) => {
  const accessToken = await getM2MAccessToken(RECOVERY_SCOPES);
  const url = `${getRecoveryBaseUrl()}${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (response.status === 403) {
    console.error(
      `Asgardeo refused ${url} with 403. The M2M application must have the Account Recovery API ` +
        "authorized WITH its scopes ticked, and the path above must match the path shown on that " +
        "API in the Console (set ASGARDEO_RECOVERY_API_VERSION to v1 or v2 to switch).",
    );
  }

  return { ok: response.ok, status: response.status, payload };
};

interface RecoveryChannel {
  id?: number;
  type?: string;
  preferred?: boolean;
}

interface InitResponseEntry {
  flowConfirmationCode?: string;
  channelInfo?: { recoveryCode?: string; channels?: RecoveryChannel[] };
}

export interface RecoveryInitiation {
  flowConfirmationCode: string;
}

/**
 * Kicks off notification-based recovery: identify the user, then ask Asgardeo to email them.
 * Returns null when the user does not exist or has no email channel — callers must still answer
 * the browser identically either way so the form cannot be used to enumerate accounts.
 */
export const requestPasswordRecovery = async (email: string): Promise<RecoveryInitiation | null> => {
  const init = await recoveryRequest("/recovery/password/init", {
    claims: [{ uri: "http://wso2.org/claims/emailaddress", value: email }],
  });

  if (!init.ok) {
    // 404 (no user) and 409 (ambiguous) are expected; anything else is worth seeing in the log.
    if (init.status !== 404 && init.status !== 409) {
      console.error("Asgardeo password recovery init failed:", init.status, init.payload);
    }
    return null;
  }

  const entries = (Array.isArray(init.payload) ? init.payload : [init.payload]) as InitResponseEntry[];
  const entry = entries.find((candidate) => candidate?.channelInfo?.recoveryCode);
  const recoveryCode = entry?.channelInfo?.recoveryCode;

  const channels = entry?.channelInfo?.channels ?? [];
  const emailChannel = channels.find((channel) => channel.type?.toUpperCase() === "EMAIL") ?? channels[0];

  if (!recoveryCode || !emailChannel?.id) return null;

  const recover = await recoveryRequest("/recovery/password/recover", {
    recoveryCode,
    channelId: String(emailChannel.id),
  });

  if (!recover.ok) {
    console.error("Asgardeo password recovery notification failed:", recover.status, recover.payload);
    return null;
  }

  const flowConfirmationCode =
    (recover.payload as { flowConfirmationCode?: string }).flowConfirmationCode ??
    entry?.flowConfirmationCode;

  return flowConfirmationCode ? { flowConfirmationCode } : null;
};

export type ConfirmCodeResult =
  | { ok: true; resetCode: string }
  | { ok: false; message: string };

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; reason: "INVALID_CODE" | "WEAK_PASSWORD" | "FAILED"; message: string };

/**
 * Step one: exchange the emailed OTP for a reset code. Kept separate from setting the password so
 * the user is only asked for a new password once their code is known to be good.
 *
 * In OTP mode the confirmation code is the `flowConfirmationCode` from the recover step, and
 * Asgardeo returns the OTP itself as the reset code.
 */
export const confirmRecoveryCode = async (
  flowConfirmationCode: string,
  otp: string,
): Promise<ConfirmCodeResult> => {
  const confirmed = await recoveryRequest("/recovery/password/confirm", {
    confirmationCode: flowConfirmationCode,
    otp,
  });

  const resetCode = (confirmed.payload as { resetCode?: string }).resetCode;

  if (!confirmed.ok || !resetCode) {
    return {
      ok: false,
      message: "That code is incorrect or has expired. Please check your email or request a new code.",
    };
  }

  return { ok: true, resetCode };
};

/** Step two: set the new password using the reset code from `confirmRecoveryCode`. */
export const setRecoveredPassword = async (
  resetCode: string,
  flowConfirmationCode: string | undefined,
  password: string,
  email?: string,
): Promise<ResetPasswordResult> => {
  const startedAt = Date.now();

  const reset = await recoveryRequest("/recovery/password/reset", {
    resetCode,
    flowConfirmationCode,
    password,
  });

  if (reset.ok) return { ok: true };

  const { code, description } = reset.payload as { code?: string; description?: string };

  // Asgardeo enforces the org's own password policy and reports violations as a 400.
  if (reset.status === 400 && description) {
    return { ok: false, reason: "WEAK_PASSWORD", message: description };
  }

  console.error("Asgardeo password reset failed:", reset.status, reset.payload);

  // PWR-18013 is WSO2's ERROR_CODE_UNEXPECTED, and it is thrown *after* the new password has
  // already been stored — confirmed against a live tenant, where the account's
  // lastPasswordUpdateTime moved and the new password authenticated successfully. Rather than
  // trust either the status or the assumption, read the timestamp back and believe that.
  if (code === "PWR-18013" && email) {
    const updatedAt = await getLastPasswordUpdateTime(email);

    if (updatedAt && updatedAt >= startedAt) {
      console.warn(
        `Asgardeo reported ${code} but the password was updated at ${new Date(updatedAt).toISOString()}; treating the reset as successful.`,
      );
      return { ok: true };
    }
  }

  return {
    ok: false,
    reason: "FAILED",
    message: "Could not reset your password. Please request a new code and try again.",
  };
};
