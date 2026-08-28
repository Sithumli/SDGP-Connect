// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextResponse } from "next/server";
import * as z from "zod";

import {
  createPkcePair,
  describeFlowFailure,
  createSignedBlob,
  createState,
  findGoogleAuthenticator,
  startAuthFlow,
  submitAuthStep,
} from "@/lib/auth/asgardeo";
import { APP_NATIVE_COOKIE_OPTIONS, GOOGLE_FLOW_COOKIE } from "@/lib/auth/appNativeCookies";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/auth/emailDomain";
import { apiErrorResponse } from "@/lib/api-error";

const startSchema = z.object({
  callbackUrl: z.string().startsWith("/").optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const validationResult = startSchema.safeParse(body);
    const callbackUrl = validationResult.success ? validationResult.data.callbackUrl : undefined;

    const { codeVerifier, codeChallenge } = createPkcePair();
    const state = createState();

    const flow = await startAuthFlow(codeChallenge, state);
    const googleAuthenticator = findGoogleAuthenticator(flow);

    if (!flow.flowId || !googleAuthenticator) {
      console.error(`Asgardeo app-native Google step unavailable: ${describeFlowFailure(flow)}`);
      return NextResponse.json({ error: "Google sign-in is unavailable right now." }, { status: 502 });
    }

    // On a multi-option step Asgardeo may list Google without its redirect URL; selecting the
    // authenticator turns the step into a REDIRECTION_PROMPT that carries it.
    let redirectUrl = googleAuthenticator.metadata?.additionalData?.redirectUrl;

    if (!redirectUrl) {
      const selected = await submitAuthStep(flow.flowId, googleAuthenticator.authenticatorId, {});
      redirectUrl = findGoogleAuthenticator(selected)?.metadata?.additionalData?.redirectUrl;

      if (!redirectUrl) {
        console.error(
          `Asgardeo app-native Google step returned no redirectUrl: ${describeFlowFailure(selected)}`,
        );
        return NextResponse.json({ error: "Google sign-in is unavailable right now." }, { status: 502 });
      }
    }

    // `hd` only pre-filters Google's account picker — it is a UI hint and can be stripped by the
    // user, so it is never relied on for enforcement. The real check runs on the email claim.
    const googleUrl = new URL(redirectUrl);
    googleUrl.searchParams.set("hd", ALLOWED_EMAIL_DOMAIN);

    const response = NextResponse.json({ redirectUrl: googleUrl.toString() });

    response.cookies.set({
      name: GOOGLE_FLOW_COOKIE,
      value: createSignedBlob({
        flowId: flow.flowId,
        authenticatorId: googleAuthenticator.authenticatorId,
        codeVerifier,
        state,
        callbackUrl: callbackUrl ?? "/dashboard",
      }),
      ...APP_NATIVE_COOKIE_OPTIONS,
    });

    return response;
  } catch (error) {
    return apiErrorResponse(
      "Error starting app-native Google sign-in",
      error,
      "Google sign-in failed. Please try again.",
    );
  }
}
