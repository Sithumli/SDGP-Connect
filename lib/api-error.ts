// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextResponse } from "next/server";

/**
 * Builds a safe JSON error response for API routes.
 *
 * Raw error messages must never be returned to the browser: Prisma failures
 * embed the database hostname and port (e.g. "Can't reach database server at
 * dbsdgp.mysql.database.azure.com:3306"), which both leaks infrastructure
 * details and reads as a crash to visitors. The real error is logged server
 * side; the client gets a stable code it can map to friendly copy.
 */

export type ApiErrorCode = "DB_UNAVAILABLE" | "INTERNAL_ERROR";

const DB_ERROR_CODES = new Set([
  "P1000", // authentication failed
  "P1001", // can't reach database server
  "P1002", // database server timed out
  "P1008", // operation timed out
  "P1017", // server has closed the connection
  "P2024", // timed out fetching a connection from the pool
]);

const DB_MESSAGE_HINTS = [
  "can't reach database server",
  "cannot reach database server",
  "connection pool",
  "econnrefused",
  "etimedout",
  "server has closed the connection",
];

/** True when the failure is the database being unreachable rather than a bug in our code. */
export function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && DB_ERROR_CODES.has(code)) return true;

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return DB_MESSAGE_HINTS.some((hint) => message.includes(hint));
}

interface ApiErrorOptions {
  /** Extra keys merged into the body, e.g. `{ success: false }` for routes that use that envelope. */
  extra?: Record<string, unknown>;
  /** Status to use when the failure is not a database outage. Defaults to 500. */
  status?: number;
}

/**
 * Logs the real error and returns a sanitized NextResponse.
 *
 * @param context Short label used in the server log, e.g. "Error fetching projects".
 * @param error   The caught error.
 * @param fallback User-facing message for non-database failures.
 */
export function apiErrorResponse(
  context: string,
  error: unknown,
  fallback = "Something went wrong. Please try again.",
  options: ApiErrorOptions = {},
): NextResponse {
  console.error(`${context}:`, error);

  const dbDown = isDatabaseUnavailable(error);
  const status = dbDown ? 503 : (options.status ?? 500);
  const code: ApiErrorCode = dbDown ? "DB_UNAVAILABLE" : "INTERNAL_ERROR";
  const message = dbDown
    ? "We're having trouble reaching our servers. Please try again in a moment."
    : fallback;

  const body: Record<string, unknown> = { error: message, code, ...options.extra };

  // Technical detail is opt-in and development only.
  if (process.env.NODE_ENV !== "production") {
    body.details = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(body, { status });
}
