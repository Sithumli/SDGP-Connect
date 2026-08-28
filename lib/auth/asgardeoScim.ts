// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { getAsgardeoBaseUrl } from "@/lib/auth/asgardeo";
import { getM2MAccessToken } from "@/lib/auth/asgardeoM2M";

const getUserStoreDomain = () =>
  process.env.ASGARDEO_USERSTORE_DOMAIN?.trim().replace(/^['"]|['"]$/g, "") || "DEFAULT";

const DELETE_REJECTED_USERS = process.env.ASGARDEO_DELETE_REJECTED_USERS?.trim() !== "false";

const SCIM_SCOPES = [
  "internal_user_mgt_create",
  "internal_user_mgt_list",
  "internal_user_mgt_view",
  "internal_user_mgt_delete",
];

const getScimAccessToken = () => getM2MAccessToken(SCIM_SCOPES);

export interface ScimCreateUserResult {
  ok: boolean;
  id?: string;
  status: number;
  message?: string;
}

export const createAsgardeoUser = async (
  email: string,
  password: string,
  givenName: string,
  familyName: string,
): Promise<ScimCreateUserResult> => {
  const accessToken = await getScimAccessToken();

  const response = await fetch(`${getAsgardeoBaseUrl()}/scim2/Users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/scim+json",
      Accept: "application/scim+json",
    },
    body: JSON.stringify({
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      userName: `${getUserStoreDomain()}/${email}`,
      password,
      name: { givenName, familyName },
      emails: [{ value: email, primary: true }],
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    detail?: string;
    scimType?: string;
  };

  return {
    ok: response.ok,
    id: payload.id,
    status: response.status,
    message: payload.detail,
  };
};

interface ScimUser {
  id?: string;
  userName?: string;
  "urn:scim:wso2:schema"?: { lastPasswordUpdateTime?: string; idpType?: string; userSourceId?: string };
}

/**
 * Local sign-ups match on userName; users provisioned from Google get a generated UUID as their
 * userName and are only findable by email claim.
 */
const findAsgardeoUserByEmail = async (accessToken: string, email: string) => {
  for (const filter of [`userName eq "${email}"`, `emails eq "${email}"`]) {
    const url = new URL(`${getAsgardeoBaseUrl()}/scim2/Users`);
    url.searchParams.set("filter", filter);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/scim+json" },
      cache: "no-store",
    });

    if (!response.ok) continue;

    const payload = (await response.json()) as { Resources?: ScimUser[] };
    const user = payload.Resources?.[0];
    if (user?.id) return user;
  }

  return undefined;
};

const findAsgardeoUserIdByEmail = async (accessToken: string, email: string) =>
  (await findAsgardeoUserByEmail(accessToken, email))?.id;

/**
 * Epoch millis of the user's last password change, or undefined when unknown. Used to confirm a
 * password reset that Asgardeo applied but then reported as an error.
 */
export const getLastPasswordUpdateTime = async (email: string): Promise<number | undefined> => {
  try {
    const accessToken = await getScimAccessToken();
    const user = await findAsgardeoUserByEmail(accessToken, email);
    const raw = user?.["urn:scim:wso2:schema"]?.lastPasswordUpdateTime;
    const parsed = raw ? Number(raw) : NaN;

    return Number.isFinite(parsed) ? parsed : undefined;
  } catch (error) {
    console.error("Could not read lastPasswordUpdateTime:", error);
    return undefined;
  }
};

/**
 * Removes a user that we just rejected on domain grounds. Google sign-in JIT-provisions the account
 * in Asgardeo before we ever see the email claim, so without this the directory accumulates users
 * who can never sign in. Failures are logged and swallowed: cleanup must never turn into a 500 on a
 * request whose real outcome is "rejected".
 */
export const deleteRejectedAsgardeoUser = async (email: string, subjectId?: string) => {
  if (!DELETE_REJECTED_USERS) return;

  try {
    const accessToken = await getScimAccessToken();
    const userId = (await findAsgardeoUserIdByEmail(accessToken, email)) ?? subjectId;
    if (!userId) return;

    const response = await fetch(`${getAsgardeoBaseUrl()}/scim2/Users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/scim+json" },
      cache: "no-store",
    });

    if (!response.ok && response.status !== 404) {
      console.error(`SCIM2 cleanup for ${email} failed with status ${response.status}`);
    }
  } catch (error) {
    console.error("SCIM2 cleanup for rejected user failed:", error);
  }
};

/**
 * Keeps the Asgardeo profile name in step with an edit made in our app. Best effort: a failure
 * here must not fail the user's save, it only means the next sign-in re-imports the old name.
 */
export const updateAsgardeoUserName = async (email: string, name: string) => {
  try {
    const accessToken = await getM2MAccessToken([...SCIM_SCOPES, "internal_user_mgt_update"]);
    const user = await findAsgardeoUserByEmail(accessToken, email);
    if (!user?.id) return;

    const [givenName, ...rest] = name.trim().split(/\s+/);

    const response = await fetch(`${getAsgardeoBaseUrl()}/scim2/Users/${user.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/scim+json",
        Accept: "application/scim+json",
      },
      body: JSON.stringify({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
        Operations: [
          {
            op: "replace",
            value: { name: { givenName, familyName: rest.join(" ") || givenName } },
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Asgardeo name sync for ${email} failed with status ${response.status}`);
    }
  } catch (error) {
    console.error("Asgardeo name sync failed:", error);
  }
};
