// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

/** Signed cookie payload carrying a password reset across its two steps. */
export interface RecoveryFlowState {
  flowConfirmationCode: string;
  email?: string;
  /** Present only after the emailed code has been verified. */
  resetCode?: string;
  expiresAt: number;
}
