// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextRequest, NextResponse } from "next/server";

import {
  GoogleFlowState,
  createFlowToken,
  getFlowErrorMessage,
  submitAuthStep,
  verifySignedBlob,
} from "@/lib/auth/asgardeo";
import { completeAppNativeFlow } from "@/lib/auth/appNativeFlow";
import {
  APP_NATIVE_COOKIE_OPTIONS,
  GOOGLE_FLOW_COOKIE,
  TICKET_COOKIE,
} from "@/lib/auth/appNativeCookies";

const redirectToLogin = (req: NextRequest, error: string) => {
  const url = new URL("/login", req.nextUrl.origin);
  url.searchParams.set("error", error);

  const response = NextResponse.redirect(url);
  response.cookies.delete(GOOGLE_FLOW_COOKIE);
  return response;
};

/**
 * Google redirects the browser straight back to us (not to Asgardeo) in the app-native federated
 * flow. We hand the code/state Google gave us to Asgardeo's authn endpoint to finish the flow.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (req.nextUrl.searchParams.get("error") || !code || !state) {
    return redirectToLogin(req, "GoogleSignInFailed");
  }

  const flowCookie = req.cookies.get(GOOGLE_FLOW_COOKIE)?.value;
  const flowState = flowCookie ? verifySignedBlob<GoogleFlowState>(flowCookie) : null;

  if (!flowState) {
    return redirectToLogin(req, "SessionExpired");
  }

  try {
    const result = await submitAuthStep(flowState.flowId, flowState.authenticatorId, { code, state });

    if (result.flowStatus !== "SUCCESS_COMPLETED" || !result.authData?.code) {
      console.error("Asgardeo app-native Google step failed:", getFlowErrorMessage(result) ?? result);
      return redirectToLogin(req, "GoogleSignInFailed");
    }

    const completion = await completeAppNativeFlow(
      result.authData.code,
      createFlowToken(flowState.codeVerifier, flowState.state),
    );

    if (!completion.ok) {
      return redirectToLogin(
        req,
        completion.reason === "DOMAIN_NOT_ALLOWED" ? "DomainNotAllowed" : "GoogleSignInFailed",
      );
    }

    const url = new URL("/login/complete", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", flowState.callbackUrl);

    const response = NextResponse.redirect(url);
    response.cookies.delete(GOOGLE_FLOW_COOKIE);
    response.cookies.set({
      name: TICKET_COOKIE,
      value: completion.ticket,
      ...APP_NATIVE_COOKIE_OPTIONS,
    });

    return response;
  } catch (error) {
    console.error("Error completing app-native Google sign-in:", error);
    return redirectToLogin(req, "GoogleSignInFailed");
  }
}
