// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextResponse } from "next/server";
import * as z from "zod";

import {
  createFlowToken,
  createPkcePair,
  createState,
  findBasicAuthenticator,
  describeFlowFailure,
  getFlowErrorMessage,
  getAppNativeRedirectUri,
  startAuthFlow,
  submitAuthStep,
} from "@/lib/auth/asgardeo";
import { completeAppNativeFlow } from "@/lib/auth/appNativeFlow";
import { DOMAIN_REJECTED_MESSAGE, isAllowedEmail } from "@/lib/auth/emailDomain";
import { apiErrorResponse } from "@/lib/api-error";
import { resolveAppOrigin } from "@/lib/auth/appOrigin";
import { enforceRateLimit, enforceSameOrigin, LOGIN_RATE_LIMIT_RULES } from "@/lib/auth/authRateLimit";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  try {
    const crossOrigin = enforceSameOrigin(req);
    if (crossOrigin) return crossOrigin;

    const limited = await enforceRateLimit(req, LOGIN_RATE_LIMIT_RULES);
    if (limited) return limited;

    const body = await req.json();
    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: "Enter a valid email and password" }, { status: 400 });
    }

    const { email, password } = validationResult.data;

    if (!isAllowedEmail(email)) {
      return NextResponse.json({ error: DOMAIN_REJECTED_MESSAGE }, { status: 403 });
    }

    const { codeVerifier, codeChallenge } = createPkcePair();
    const state = createState();
    const redirectUri = getAppNativeRedirectUri(resolveAppOrigin(req));

    const flow = await startAuthFlow(codeChallenge, state, redirectUri);
    const basicAuthenticator = findBasicAuthenticator(flow);

    if (!flow.flowId || !basicAuthenticator) {
      console.error(`Asgardeo app-native username/password step unavailable: ${describeFlowFailure(flow, redirectUri)}`);
      return NextResponse.json({ error: "Sign-in is unavailable right now." }, { status: 502 });
    }

    const result = await submitAuthStep(flow.flowId, basicAuthenticator.authenticatorId, {
      username: email,
      password,
    });

    if (result.flowStatus !== "SUCCESS_COMPLETED" || !result.authData?.code) {
      return NextResponse.json(
        { error: getFlowErrorMessage(result) ?? "Invalid email or password." },
        { status: 401 },
      );
    }

    const completion = await completeAppNativeFlow(
      result.authData.code,
      createFlowToken(codeVerifier, state, redirectUri),
    );

    if (!completion.ok) {
      return NextResponse.json(
        { error: completion.message },
        { status: completion.reason === "DOMAIN_NOT_ALLOWED" ? 403 : 401 },
      );
    }

    return NextResponse.json({ ticket: completion.ticket });
  } catch (error) {
    return apiErrorResponse("Error during app-native login", error, "Sign-in failed. Please try again.");
  }
}
