// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { getAsgardeoBaseUrl } from "@/lib/auth/asgardeo";

const getRequiredEnv = (key: string) => {
  const value = process.env[key]?.trim().replace(/^['"]|['"]$/g, "");

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

/**
 * Client-credentials token for the server-only M2M application. Never used in the browser.
 * Scopes are requested per call so each caller only asks for what it needs.
 */
export const getM2MAccessToken = async (scopes: readonly string[]): Promise<string> => {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: getRequiredEnv("ASGARDEO_SCIM_CLIENT_ID"),
    client_secret: getRequiredEnv("ASGARDEO_SCIM_CLIENT_SECRET"),
    scope: scopes.join(" "),
  });

  const response = await fetch(`${getAsgardeoBaseUrl()}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Asgardeo M2M token request failed with status ${response.status}`);
  }

  const tokens = (await response.json()) as { access_token?: string; scope?: string };
  if (!tokens.access_token) {
    throw new Error("Asgardeo M2M token request returned no access token");
  }

  // Asgardeo issues a token carrying only the scopes the application is actually authorized for,
  // rather than failing the request. Without this check the first sign of a misconfigured M2M app
  // is an opaque 403 from whichever API is called next.
  const granted = new Set((tokens.scope ?? "").split(/\s+/).filter(Boolean));
  const missing = scopes.filter((scope) => !granted.has(scope));

  if (missing.length > 0) {
    console.error(
      `Asgardeo M2M token is missing scope(s): ${missing.join(", ")}. ` +
        `Granted: ${[...granted].join(", ") || "none"}. ` +
        "Authorize the corresponding API on the M2M application in the Asgardeo Console.",
    );
  }

  return tokens.access_token;
};
