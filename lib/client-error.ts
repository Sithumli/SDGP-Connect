// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

/**
 * Turns whatever a fetch/axios/Prisma failure gave us into copy that is safe and
 * useful to show a visitor. Raw messages (stack traces, database hostnames,
 * Prisma invocations) must never reach the UI.
 */

export type ErrorKind = "offline" | "database" | "server" | "notFound" | "unknown";

export interface FriendlyError {
  kind: ErrorKind;
  title: string;
  description: string;
}

const DATABASE_HINTS = [
  "can't reach database server",
  "cannot reach database server",
  "prisma",
  "econnrefused",
  "etimedout",
  "connection pool",
  "too many connections",
  "database server",
];

const NETWORK_HINTS = [
  "failed to fetch",
  "network error",
  "networkerror",
  "load failed",
  "err_internet_disconnected",
];

/** Pulls a lowercase message out of anything that might be an error. */
function readMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error.toLowerCase();
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === "object") {
    const maybe = error as { message?: unknown; error?: unknown };
    if (typeof maybe.message === "string") return maybe.message.toLowerCase();
    if (typeof maybe.error === "string") return maybe.error.toLowerCase();
  }
  return "";
}

function readStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const maybe = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof maybe.status === "number") return maybe.status;
  if (typeof maybe.response?.status === "number") return maybe.response.status;

  // Messages built as `Error 500: ...` by some of our hooks.
  const match = readMessage(error).match(/\b(\d{3})\b/);
  return match ? Number(match[1]) : null;
}

export function classifyError(error: unknown): ErrorKind {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "offline";
  }

  const message = readMessage(error);
  const status = readStatus(error);

  if (status === 404) return "notFound";
  if (DATABASE_HINTS.some((hint) => message.includes(hint))) return "database";
  if (status === 503 || status === 504) return "database";
  if (NETWORK_HINTS.some((hint) => message.includes(hint))) return "offline";
  if (status && status >= 500) return "server";
  if (message) return "server";

  return "unknown";
}

const COPY: Record<ErrorKind, Omit<FriendlyError, "kind">> = {
  offline: {
    title: "You appear to be offline",
    description:
      "We couldn't reach SDGP Connect. Check your internet connection and we'll pick up right where you left off.",
  },
  database: {
    title: "Something went wrong on our end",
    description:
      "We're having trouble reaching our servers right now. Nothing is lost — please try again in a moment.",
  },
  server: {
    title: "Something went wrong",
    description:
      "We couldn't load this right now. Our team has been notified — please try again in a moment.",
  },
  notFound: {
    title: "We couldn't find that",
    description: "The page or item you're looking for doesn't exist or may have been removed.",
  },
  unknown: {
    title: "Something went wrong",
    description: "We couldn't load this right now. Please try again in a moment.",
  },
};

export function toFriendlyError(error: unknown): FriendlyError {
  const kind = classifyError(error);
  return { kind, ...COPY[kind] };
}

/** Raw message, for development-only debugging surfaces. Never render in production. */
export function getErrorDetail(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
