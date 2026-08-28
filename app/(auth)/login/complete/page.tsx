// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { Suspense } from "react";

import AppNativeComplete from "@/components/AppNativeComplete";

export default function LoginCompletePage() {
  return (
    <Suspense fallback={null}>
      <AppNativeComplete />
    </Suspense>
  );
}
