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
  startAuthFlow,
  submitAuthStep,
} from "@/lib/auth/asgardeo";
import { completeAppNativeFlow } from "@/lib/auth/appNativeFlow";
import { createAsgardeoUser, deleteRejectedAsgardeoUser } from "@/lib/auth/asgardeoScim";
import { DOMAIN_REJECTED_MESSAGE, isAllowedEmail } from "@/lib/auth/emailDomain";
import { apiErrorResponse } from "@/lib/api-error";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationResult = signupSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message ?? "Invalid details" },
        { status: 400 },
      );
    }

    const { name, email, password } = validationResult.data;

    if (!isAllowedEmail(email)) {
      return NextResponse.json({ error: DOMAIN_REJECTED_MESSAGE }, { status: 403 });
    }

    const [givenName, ...rest] = name.trim().split(/\s+/);
    const created = await createAsgardeoUser(email, password, givenName, rest.join(" ") || givenName);

    if (!created.ok) {
      if (created.status === 409) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in instead." },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: created.message ?? "Could not create your account. Please try again." },
        { status: 400 },
      );
    }

    const { codeVerifier, codeChallenge } = createPkcePair();
    const state = createState();

    const flow = await startAuthFlow(codeChallenge, state);
    const basicAuthenticator = findBasicAuthenticator(flow);

    if (!flow.flowId || !basicAuthenticator) {
      console.error(`Asgardeo app-native username/password step unavailable: ${describeFlowFailure(flow)}`);
      return NextResponse.json({ error: "Sign-up is unavailable right now." }, { status: 502 });
    }

    const result = await submitAuthStep(flow.flowId, basicAuthenticator.authenticatorId, {
      username: email,
      password,
    });

    if (result.flowStatus !== "SUCCESS_COMPLETED" || !result.authData?.code) {
      return NextResponse.json(
        {
          error:
            getFlowErrorMessage(result) ??
            "Your account was created but we could not sign you in. Please try signing in.",
        },
        { status: 401 },
      );
    }

    const completion = await completeAppNativeFlow(
      result.authData.code,
      createFlowToken(codeVerifier, state),
    );

    if (!completion.ok) {
      // completeAppNativeFlow only cleans up when it can read the email claim; the account we just
      // created is ours either way, so make sure it does not survive a rejected sign-up.
      if (completion.reason === "DOMAIN_NOT_ALLOWED") await deleteRejectedAsgardeoUser(email, created.id);

      return NextResponse.json(
        { error: completion.message },
        { status: completion.reason === "DOMAIN_NOT_ALLOWED" ? 403 : 401 },
      );
    }

    return NextResponse.json({ ticket: completion.ticket });
  } catch (error) {
    return apiErrorResponse("Error during app-native signup", error, "Sign-up failed. Please try again.");
  }
}
