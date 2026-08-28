// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.
"use client"

import * as React from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ProfileUser {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
}

const AccountSettings: React.FC = () => {
  const { update } = useSession()
  const [user, setUser] = React.useState<ProfileUser | null>(null)
  const [name, setName] = React.useState("")
  const [image, setImage] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/user/profile")
        const data = await response.json()

        if (!response.ok) {
          setError(data.error ?? "Could not load your profile.")
        } else {
          setUser(data.user)
          setName(data.user.name ?? "")
          setImage(data.user.image ?? "")
        }
      } catch {
        setError("Could not load your profile.")
      }
      setLoading(false)
    }

    load()
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setSaving(true)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Could not save your changes.")
      } else {
        setUser(data.user)
        toast.success("Profile updated.")
        // Refresh the session so the navbar picks the new name up without a reload.
        await update()
      }
    } catch {
      setError("Something went wrong. Please try again.")
    }

    setSaving(false)
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading your account...</p>
  }

  if (!user) {
    return <p className="text-sm text-destructive">{error || "Account not found."}</p>
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Update how your name and picture appear across SDGP.lk.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border bg-card p-6">
        <div className="flex items-center gap-4">
          {image ? (
            <Image
              src={image}
              alt="Profile picture"
              width={64}
              height={64}
              unoptimized
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div className="grid size-16 place-items-center rounded-full bg-muted text-lg font-semibold">
              {(name || user.email).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium">{name || "Unnamed"}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Your full name"
            required
            minLength={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">Profile picture URL</Label>
          <Input
            id="image"
            type="url"
            value={image}
            onChange={event => setImage(event.target.value)}
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground">Leave blank to use your initial.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled readOnly />
            <p className="text-xs text-muted-foreground">
              Your email identifies your account and cannot be changed here.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={user.role} disabled readOnly />
            <p className="text-xs text-muted-foreground">Roles are assigned by an administrator.</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default AccountSettings
