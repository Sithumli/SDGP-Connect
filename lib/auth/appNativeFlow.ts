// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import {
  TICKET_TTL_MS,
  createSignedBlob,
  exchangeCodeForTokens,
  resolveClaims,
  verifyFlowToken,
  verifySignedBlob,
} from "@/lib/auth/asgardeo";
import { getRoleFromAsgardeoProfile } from "@/lib/auth/asgardeoRole";
import { deleteRejectedAsgardeoUser } from "@/lib/auth/asgardeoScim";
import { DOMAIN_REJECTED_MESSAGE, isAllowedEmail } from "@/lib/auth/emailDomain";
import { Role } from "@/types/prisma-types";

const TICKET_PURPOSE = "app-native-sign-in";

export interface AppNativeTicketPayload {
  purpose: string;
  sub: string;
  email: string;
  name: string | null;
  image: string | null;
  /** Null when Asgardeo supplied no role claim — the local role must then be left alone. */
  role: Role | null;
  expiresAt: number;
}

export type CompleteFlowResult =
  | { ok: true; ticket: string; email: string }
  | { ok: false; reason: "DOMAIN_NOT_ALLOWED" | "FLOW_EXPIRED" | "FAILED"; message: string };

/**
 * The single choke point where an Asgardeo authorization code turns into an identity our app will
 * accept. Both entry points (email/password and Google) go through here, so the domain rule is
 * applied to the email claim Asgardeo returns rather than to anything the browser told us.
 */
export const completeAppNativeFlow = async (
  code: string,
  flowToken: string,
): Promise<CompleteFlowResult> => {
  const flowState = verifyFlowToken(flowToken);
  if (!flowState) {
    return { ok: false, reason: "FLOW_EXPIRED", message: "Your sign-in session expired. Please try again." };
  }

  let claims;
  try {
    const tokens = await exchangeCodeForTokens(code, flowState.codeVerifier);
    claims = await resolveClaims(tokens);
  } catch (error) {
    console.error("Asgardeo app-native token exchange failed:", error);
    return { ok: false, reason: "FAILED", message: "Sign-in failed. Please try again." };
  }

  const email = (claims.email ?? claims.username ?? "").trim();

  if (!isAllowedEmail(email)) {
    // Google sign-in JIT-provisions the account before we can see the claim, so clean it up.
    if (email) await deleteRejectedAsgardeoUser(email, claims.sub);
    return { ok: false, reason: "DOMAIN_NOT_ALLOWED", message: DOMAIN_REJECTED_MESSAGE };
  }

  const name =
    claims.name?.trim() ||
    `${claims.given_name ?? ""} ${claims.family_name ?? ""}`.trim() ||
    null;

  const ticket = createSignedBlob({
    purpose: TICKET_PURPOSE,
    sub: claims.sub ?? email,
    email: email.toLowerCase(),
    name,
    image: claims.picture ?? null,
    role: getRoleFromAsgardeoProfile(claims as Record<string, unknown>),
  }, TICKET_TTL_MS);

  return { ok: true, ticket, email };
};

/** Re-validates a ticket inside the NextAuth credentials provider before a session is minted. */
export const verifyAppNativeTicket = (ticket: string): AppNativeTicketPayload | null => {
  const payload = verifySignedBlob<AppNativeTicketPayload>(ticket);
  if (!payload || payload.purpose !== TICKET_PURPOSE) return null;

  // Defence in depth: the ticket is server-signed, but the rule is re-applied where the session is created.
  if (!isAllowedEmail(payload.email)) return null;

  return payload;
};
