// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import type { Metadata } from "next";

import AccountSettings from "@/components/AccountSettings";

export const metadata: Metadata = {
  title: "My Account",
};

export default function ProfilePage() {
  return <AccountSettings />;
}
