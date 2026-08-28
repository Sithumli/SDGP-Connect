// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { Role } from "@/types/prisma-types";

const normalizeRole = (value: unknown): Role | null => {
  if (typeof value !== "string") return null;

  const role = value.trim().toUpperCase();
  if (role.includes("ADMIN")) return Role.ADMIN;
  if (role.includes("MODERATOR")) return Role.MODERATOR;
  if (role.includes("DEVELOPER")) return Role.DEVELOPER;
  if (role.includes("STUDENT")) return Role.STUDENT;

  return null;
};

const valuesFromClaim = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(/[,\s]+/).filter(Boolean);
  return [];
};

export const getRoleFromAsgardeoProfile = (profile: Record<string, unknown>): Role | null => {
  const roleClaims = [
    profile.role,
    profile.roles,
    profile.groups,
    profile["http://wso2.org/claims/role"],
    profile["http://wso2.org/claims/roles"],
    profile["http://wso2.org/claims/groups"],
  ];

  for (const claim of roleClaims.flatMap(valuesFromClaim)) {
    const role = normalizeRole(claim);
    if (role) return role;
  }

  return null;
};
