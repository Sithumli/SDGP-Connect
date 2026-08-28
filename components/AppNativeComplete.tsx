// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.
"use client"

import * as React from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"

/**
 * Landing page for the Google leg of the app-native flow. The callback route has already exchanged
 * the code and enforced the domain rule; all that is left is to redeem the signed ticket for a
 * NextAuth session.
 */
const AppNativeComplete: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"

  React.useEffect(() => {
    let cancelled = false

    const complete = async () => {
      try {
        const response = await fetch("/api/auth/app-native/result")
        const data = await response.json()

        if (cancelled) return

        if (!response.ok || !data.ticket) {
          router.replace("/login?error=SessionExpired")
          return
        }

        const result = await signIn("asgardeo", { ticket: data.ticket, redirect: false })

        if (cancelled) return

        if (result?.error) {
          router.replace(`/login?error=${encodeURIComponent(result.error)}`)
          return
        }

        router.replace(callbackUrl)
        router.refresh()
      } catch {
        if (!cancelled) router.replace("/login?error=GoogleSignInFailed")
      }
    }

    complete()
    return () => {
      cancelled = true
    }
  }, [callbackUrl, router])

  return (
    <div className="grid h-screen place-items-center bg-black text-zinc-400">
      <div className="flex items-center gap-3 text-sm">
        <span className="size-4 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-200" />
        <span>Completing sign-in...</span>
      </div>
    </div>
  )
}

export default AppNativeComplete
