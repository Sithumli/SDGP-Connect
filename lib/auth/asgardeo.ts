// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import crypto from "crypto";

const getRequiredEnv = (key: string) => {
  const value = process.env[key]?.trim().replace(/^['"]|['"]$/g, "");

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const getOptionalEnv = (key: string) => process.env[key]?.trim().replace(/^['"]|['"]$/g, "") || undefined;

/**
 * Asgardeo's OIDC issuer is `https://api.asgardeo.io/t/<org>/oauth2/token`, which is not a usable
 * prefix for the other endpoints. Strip the trailing `/oauth2/token` to get the organisation base.
 */
export const getAsgardeoBaseUrl = () =>
  (getOptionalEnv("ASGARDEO_BASE_URL") ?? getRequiredEnv("ASGARDEO_ISSUER_URL"))
    .replace(/\/+$/, "")
    .replace(/\/oauth2\/token$/, "");

export const getAppNativeRedirectUri = () =>
  getOptionalEnv("ASGARDEO_APP_NATIVE_REDIRECT_URI") ??
  `${getRequiredEnv("NEXTAUTH_URL").replace(/\/+$/, "")}/api/auth/app-native/google/callback`;

export const getAsgardeoClientId = () => getRequiredEnv("ASGARDEO_CLIENT_ID");
const getAsgardeoClientSecret = () => getRequiredEnv("ASGARDEO_CLIENT_SECRET");

export interface AuthenticatorParam {
  param: string;
  type: string;
  isConfidential: boolean;
  order: number;
  i18nKey?: string;
}

export interface Authenticator {
  authenticatorId: string;
  authenticator: string;
  idp: string;
  requiredParams?: string[];
  metadata?: {
    i18nKey?: string;
    promptType?: string;
    params?: AuthenticatorParam[];
    additionalData?: Record<string, string>;
  };
}

export interface FlowResponse {
  /** Asgardeo answers errors with a `{ code, message, description }` envelope instead of a flow. */
  code?: string;
  message?: string;
  description?: string;
  flowId?: string;
  flowStatus?: "INCOMPLETE" | "FAILED_INCOMPLETE" | "SUCCESS_COMPLETED";
  flowType?: string;
  nextStep?: {
    stepType?: string;
    authenticators?: Authenticator[];
    messages?: { type: string; messageId?: string; message?: string }[];
  };
  authData?: { code?: string; session_state?: string; state?: string };
}

export interface AsgardeoTokens {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expires_in?: number;
}

export interface AsgardeoClaims {
  sub?: string;
  email?: string;
  username?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
  [claim: string]: unknown;
}

const base64UrlEncode = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const getBasicAuthHeader = () =>
  `Basic ${Buffer.from(`${getAsgardeoClientId()}:${getAsgardeoClientSecret()}`).toString("base64")}`;

export const createPkcePair = () => {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const codeChallenge = base64UrlEncode(crypto.createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
};

export const createState = () => base64UrlEncode(crypto.randomBytes(16));

/**
 * Starts an app-native flow. `response_mode=direct` makes Asgardeo answer with the JSON flow
 * descriptor instead of redirecting the browser to its hosted login page.
 */
export const startAuthFlow = async (codeChallenge: string, state: string): Promise<FlowResponse> => {
  const body = new URLSearchParams({
    client_id: getAsgardeoClientId(),
    response_type: "code",
    redirect_uri: getAppNativeRedirectUri(),
    scope: "openid email profile",
    state,
    response_mode: "direct",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  // WSO2 runs its client-authentication filter over /oauth2/authorize, so a confidential client
  // must authenticate here too — without it Asgardeo answers 401 "Unsupported client
  // authentication mechanism" before the flow is ever created.
  const response = await fetch(`${getAsgardeoBaseUrl()}/oauth2/authorize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: getBasicAuthHeader(),
    },
    body,
    cache: "no-store",
  });

  return (await response.json()) as FlowResponse;
};

/** Submits one step of the flow. The flowId ties this call back to the flow started above. */
export const submitAuthStep = async (
  flowId: string,
  authenticatorId: string,
  params: Record<string, string>,
): Promise<FlowResponse> => {
  const response = await fetch(`${getAsgardeoBaseUrl()}/oauth2/authn`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ flowId, selectedAuthenticator: { authenticatorId, params } }),
    cache: "no-store",
  });

  return (await response.json()) as FlowResponse;
};

export const findAuthenticator = (
  flow: FlowResponse,
  predicate: (authenticator: Authenticator) => boolean,
): Authenticator | undefined => flow.nextStep?.authenticators?.find(predicate);

export const findBasicAuthenticator = (flow: FlowResponse) =>
  findAuthenticator(
    flow,
    (authenticator) =>
      authenticator.idp === "LOCAL" &&
      (authenticator.requiredParams ?? []).includes("username") &&
      (authenticator.requiredParams ?? []).includes("password"),
  );

export const findGoogleAuthenticator = (flow: FlowResponse) =>
  findAuthenticator(
    flow,
    (authenticator) =>
      authenticator.idp.toLowerCase().includes("google") ||
      authenticator.authenticator.toLowerCase().includes("google"),
  );

/**
 * Asgardeo often puts a raw i18n key (e.g. "login.fail.message") in the message field, which is
 * meant to be resolved by its own hosted UI. We render our own login page, so anything that still
 * looks like a key is swapped for copy a user can actually read.
 */
const WSO2_MESSAGE_COPY: Record<string, string> = {
  "login.fail.message": "Invalid email or password.",
  "account.confirmation.pending": "Please confirm your account before signing in.",
  "user.account.locked": "This account is locked. Please contact an administrator.",
  "user.account.disabled": "This account is disabled. Please contact an administrator.",
  "credential.expired": "Your password has expired. Please reset it before signing in.",
};

const looksLikeI18nKey = (value: string) => /^[\w-]+(\.[\w-]+)+$/.test(value.trim());

const humanizeFlowMessage = (value: string | undefined) => {
  if (!value) return undefined;

  const key = value.trim();
  if (WSO2_MESSAGE_COPY[key]) return WSO2_MESSAGE_COPY[key];

  return looksLikeI18nKey(key) ? undefined : key;
};

export const getFlowErrorMessage = (flow: FlowResponse) => {
  const error = flow.nextStep?.messages?.find((message) => message.type === "ERROR");
  if (!error) return undefined;

  return humanizeFlowMessage(error.message) ?? humanizeFlowMessage(error.messageId);
};

/** Describes why a response carries no usable flow, so logs name the real cause. */
export const describeFlowFailure = (flow: FlowResponse) => {
  if (flow.code || flow.description) {
    return `Asgardeo rejected the request (${flow.code ?? "no code"}): ${flow.description ?? flow.message}`;
  }
  if (!flow.flowId) {
    return "Asgardeo returned no flowId";
  }

  const offered = (flow.nextStep?.authenticators ?? []).map(
    (authenticator) =>
      `${authenticator.idp}/${authenticator.authenticator}` +
      ` [promptType=${authenticator.metadata?.promptType ?? "none"},` +
      ` additionalData=${Object.keys(authenticator.metadata?.additionalData ?? {}).join("|") || "none"}]`,
  );

  return `stepType=${flow.nextStep?.stepType ?? "none"}; offered: ${offered.join(", ") || "nothing"}`;
};

export const exchangeCodeForTokens = async (
  code: string,
  codeVerifier: string,
): Promise<AsgardeoTokens> => {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getAppNativeRedirectUri(),
    client_id: getAsgardeoClientId(),
    client_secret: getAsgardeoClientSecret(),
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${getAsgardeoBaseUrl()}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Asgardeo token exchange failed with status ${response.status}`);
  }

  return (await response.json()) as AsgardeoTokens;
};

/**
 * The id_token arrives over a server-to-server TLS call to the token endpoint that we authenticated
 * to with the client secret, so the payload is trusted without a separate JWKS signature check.
 */
export const decodeIdToken = (idToken: string): AsgardeoClaims => {
  const payload = idToken.split(".")[1];
  if (!payload) return {};

  try {
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as AsgardeoClaims;
  } catch {
    return {};
  }
};

export const fetchUserInfo = async (accessToken: string): Promise<AsgardeoClaims> => {
  const response = await fetch(`${getAsgardeoBaseUrl()}/oauth2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) return {};

  return (await response.json()) as AsgardeoClaims;
};

/** Resolves the verified claims for a completed flow, falling back to userinfo when the
 *  application has not mapped the email claim onto the id_token. */
export const resolveClaims = async (tokens: AsgardeoTokens): Promise<AsgardeoClaims> => {
  const claims = tokens.id_token ? decodeIdToken(tokens.id_token) : {};
  if (claims.email) return claims;

  return { ...claims, ...(await fetchUserInfo(tokens.access_token)) };
};

// ---------------------------------------------------------------------------
// Signed flow token
// ---------------------------------------------------------------------------

export interface FlowTokenPayload {
  codeVerifier: string;
  state: string;
  expiresAt: number;
}

/** Flow state that has to survive the browser round-trip out to Google and back. */
export interface GoogleFlowState {
  flowId: string;
  authenticatorId: string;
  codeVerifier: string;
  state: string;
  callbackUrl: string;
  expiresAt: number;
}

const SIGNED_BLOB_TTL_MS = 10 * 60 * 1000;

/** A ticket only has to survive one immediate round-trip, so it expires well before a flow blob. */
export const TICKET_TTL_MS = 2 * 60 * 1000;

/** Recovery spans an email round-trip, so it must outlive the default. */
export const RECOVERY_TTL_MS = 60 * 60 * 1000;

const signPayload = (payload: string) =>
  base64UrlEncode(
    crypto.createHmac("sha256", getRequiredEnv("NEXTAUTH_SECRET")).update(payload).digest(),
  );

export const createSignedBlob = (
  data: Record<string, unknown>,
  ttlMs: number = SIGNED_BLOB_TTL_MS,
): string => {
  const payload = base64UrlEncode(JSON.stringify({ ...data, expiresAt: Date.now() + ttlMs }));
  return `${payload}.${signPayload(payload)}`;
};

export const verifySignedBlob = <T extends { expiresAt: number }>(blob: string): T | null => {
  const [payload, signature] = blob.split(".");
  if (!payload || !signature) return null;

  // Compare as bytes: a multi-byte signature can match on string length yet differ in byte
  // length, and timingSafeEqual throws rather than returning false when the buffers differ.
  const expected = Buffer.from(signPayload(payload));
  const provided = Buffer.from(signature);

  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as T;
    return parsed.expiresAt > Date.now() ? parsed : null;
  } catch {
    return null;
  }
};

/** Carries the PKCE verifier back to the credentials provider without exposing it to page JS. */
export const createFlowToken = (codeVerifier: string, state: string) =>
  createSignedBlob({ codeVerifier, state });

export const verifyFlowToken = (flowToken: string) => verifySignedBlob<FlowTokenPayload>(flowToken);
