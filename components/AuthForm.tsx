// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.
"use client"

import * as React from "react"
import { ChevronLeft, Info } from "lucide-react"
import { motion } from "framer-motion"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"

import { safeCallbackUrl } from "@/lib/auth/callbackUrl"

const ALLOWED_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "iit.ac.lk"

const loginImages = [
  "/home/hero/dialog-ino.webp",
  "/home/hero/movemate1.webp",
  "/home/hero/3.webp",
]

const AuthForm: React.FC = () => {
  return (
    <div className="grid h-screen place-items-center overflow-hidden bg-black text-zinc-200">
      <BackButton />
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-4xl px-4 sm:px-0"
      >
        {/* Split card container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 rounded-2xl border border-zinc-800 overflow-hidden shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)]">
          {/* LEFT PANEL: Form */}
          <div className="bg-zinc-900 px-10 py-12 flex flex-col justify-between min-h-[520px]">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <Image src="/iconw.svg" alt="Logo" width={40} height={40} className="h-25 w-25" />
            </motion.div>

            {/* Heading + form */}
            <div className="flex flex-col gap-8">
              <LoginForm />
            </div>

            {/* Footer */}
            <p className="text-xs text-zinc-600">© 2026 SDGP.lk · All rights reserved</p>
          </div>

          {/* RIGHT PANEL: Visual */}
          <RightPanel />
        </div>
      </motion.div>

      <BackgroundDecoration />
    </div>
  )
}

const BackButton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.2 }}
    className="fixed left-4 top-4 sm:left-8 sm:top-8 z-50" 
  >
    <Link href="/">
      <button
        type="button"
        className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800
        bg-zinc-900 px-4 py-2.5 font-medium text-zinc-200
        transition-all duration-300 hover:bg-zinc-800 active:scale-[0.98]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600/40 w-fit"
      >
        <span className="text-zinc-400"><ChevronLeft size={16} /></span>
        <span>Go back</span>
      </button>
    </Link>
  </motion.div>
)

const getAuthErrorMessage = (error: string | null) => {
  if (error === "AccessDenied" || error === "DomainNotAllowed") {
    return `Only @${ALLOWED_EMAIL_DOMAIN} email accounts can sign in here.`
  }
  if (error === "SessionExpired") {
    return "Your sign-in session expired. Please try again."
  }
  if (error === "GoogleSignInFailed") {
    return "Google sign-in failed. Please try again."
  }
  if (!error || error === "undefined") {
    return "Sign-in failed. Please check the Asgardeo configuration and try again."
  }
  return `Sign-in failed (${error}). Please try again.`
}

const ALLOWED_EMAIL_EXCEPTIONS = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_EXCEPTIONS ?? "")
  .split(",")
  .map(entry => entry.trim().toLowerCase())
  .filter(Boolean)

const isAllowedEmail = (email: string) => {
  const normalized = email.trim().toLowerCase()
  return normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`) || ALLOWED_EMAIL_EXCEPTIONS.includes(normalized)
}

const inputClassName =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-100 " +
  "placeholder:text-zinc-600 transition-colors duration-200 focus:border-zinc-500 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40"

type AuthMode = "signin" | "signup" | "reset"
type ResetStage = "request" | "verify" | "password"
type SignupStage = "details" | "verify"

const LoginForm: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = React.useState<AuthMode>("signin")
  const [resetStage, setResetStage] = React.useState<ResetStage>("request")
  const [signupStage, setSignupStage] = React.useState<SignupStage>("details")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [otp, setOtp] = React.useState("")
  const [error, setError] = React.useState("")
  const [notice, setNotice] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [googleLoading, setGoogleLoading] = React.useState(false)
  const callbackUrlFromQuery = searchParams.get("callbackUrl")
  const dashboardCallbackUrl = safeCallbackUrl(callbackUrlFromQuery)
  const authError = searchParams.get("error")

  React.useEffect(() => {
    if (authError) {
      setError(getAuthErrorMessage(authError))
      toast.error("Sign-in failed.")
    }
  }, [authError])

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setResetStage("request")
    setSignupStage("details")
    setError("")
    setNotice("")
    setPassword("")
    setConfirmPassword("")
    setOtp("")
  }

  const post = async (url: string, body: unknown) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return { response, data: await response.json() }
  }

  const redeemTicket = async (ticket: string) => {
    const result = await signIn("asgardeo", { ticket, redirect: false })

    if (result?.error) {
      setError(getAuthErrorMessage(result.error))
      setLoading(false)
      return
    }

    router.push(dashboardCallbackUrl)
    router.refresh()
  }

  const handleReset = async () => {
    if (resetStage === "request") {
      const { response, data } = await post("/api/auth/app-native/password-reset/request", { email })

      if (!response.ok) {
        setError(data.error ?? "Could not start the reset. Please try again.")
      } else {
        // Always advance, even when no account matched, so this cannot reveal who is registered.
        setNotice(data.message ?? "If an account exists for that email, a code is on its way.")
        setResetStage("verify")
      }
      return
    }

    if (resetStage === "verify") {
      const { response, data } = await post("/api/auth/app-native/password-reset/verify", { otp })

      if (!response.ok) {
        setError(data.error ?? "That code is incorrect. Please try again.")
      } else {
        setNotice("Code verified. Choose a new password.")
        setResetStage("password")
      }
      return
    }

    if (password !== confirmPassword) {
      setError("Both passwords must match.")
      return
    }

    const { response, data } = await post("/api/auth/app-native/password-reset/confirm", { password })

    if (!response.ok) {
      setError(data.error ?? "Could not reset your password. Please try again.")
    } else {
      toast.success("Password reset. You can sign in now.")
      switchMode("signin")
    }
  }

  const handleSignup = async () => {
    if (signupStage === "details") {
      const { response, data } = await post("/api/auth/app-native/signup", { name, email, password })

      if (!response.ok) {
        setError(data.error ?? "Sign-up failed. Please try again.")
      } else {
        setNotice(data.message ?? "We've emailed you a 6-digit code.")
        setSignupStage("verify")
      }
      return
    }

    const { response, data } = await post("/api/auth/app-native/signup/verify", { otp, name, password })

    if (!response.ok) {
      setError(data.error ?? "That code is incorrect. Please try again.")
      return
    }

    // The account exists now, so the password entered a moment ago can complete a normal sign-in.
    // It was never stored server side — it is still in this form's state.
    const login = await post("/api/auth/app-native/login", { email, password })

    if (!login.response.ok || !login.data.ticket) {
      toast.success("Email verified. Please sign in.")
      switchMode("signin")
      return
    }

    await redeemTicket(login.data.ticket)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setNotice("")

    // UX pre-check only — the same rule is enforced again on the server for every attempt.
    const needsEmailCheck = mode === "signin" || (mode === "signup" && signupStage === "details") || (mode === "reset" && resetStage === "request")
    if (needsEmailCheck && !isAllowedEmail(email)) {
      setError(`Please use your IIT email address (@${ALLOWED_EMAIL_DOMAIN}).`)
      return
    }

    if (mode === "signup" && signupStage === "details" && password !== confirmPassword) {
      setError("Both passwords must match.")
      return
    }

    setLoading(true)
    try {
      if (mode === "reset") {
        await handleReset()
        setLoading(false)
        return
      }

      if (mode === "signup") {
        await handleSignup()
        setLoading(false)
        return
      }

      const { response, data } = await post("/api/auth/app-native/login", { email, password })

      if (!response.ok || !data.ticket) {
        setError(data.error ?? "Sign-in failed. Please try again.")
        setLoading(false)
        return
      }

      await redeemTicket(data.ticket)
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    setNotice("")
    setGoogleLoading(true)
    try {
      const { response, data } = await post("/api/auth/app-native/google/start", {
        callbackUrl: dashboardCallbackUrl,
      })

      if (!response.ok || !data.redirectUrl) {
        setError(data.error ?? "Google sign-in is unavailable right now.")
        setGoogleLoading(false)
        return
      }

      window.location.href = data.redirectUrl
    } catch {
      setError("Something went wrong. Please try again.")
      setGoogleLoading(false)
    }
  }

  const busy = loading || googleLoading
  const signupVerifying = mode === "signup" && signupStage === "verify"
  const showEmail = (mode !== "reset" || resetStage === "request") && !signupVerifying
  const showPassword =
    mode === "signin" ||
    (mode === "signup" && signupStage === "details") ||
    (mode === "reset" && resetStage === "password")
  const showConfirmPassword =
    (mode === "signup" && signupStage === "details") || (mode === "reset" && resetStage === "password")
  const showOtp = signupVerifying || (mode === "reset" && resetStage === "verify")
  const showGoogle = mode === "signin" || (mode === "signup" && signupStage === "details")

  const heading = {
    signin: <>Welcome<br /><span className="text-zinc-500">back.</span></>,
    signup: <>Create your<br /><span className="text-zinc-500">account.</span></>,
    reset: <>Reset your<br /><span className="text-zinc-500">password.</span></>,
  }[mode]

  const subheading =
    mode === "signup"
      ? signupStage === "verify"
        ? "Enter the 6-digit code we emailed you"
        : `Sign up with your @${ALLOWED_EMAIL_DOMAIN} email to get started`
      : mode === "signin"
        ? "Sign in to your account to continue"
        : resetStage === "request"
          ? "We'll email you a 6-digit code"
          : resetStage === "verify"
            ? "Enter the 6-digit code we emailed you"
            : "Choose a new password"

  const submitLabel = {
    signin: "Sign in",
    signup: signupStage === "verify" ? "Verify and continue" : "Create account",
    reset: { request: "Email me a code", verify: "Verify code", password: "Reset password" }[resetStage],
  }[mode]

  const busyLabel = {
    signin: "Signing in...",
    signup: signupStage === "verify" ? "Verifying..." : "Creating account...",
    reset: { request: "Sending code...", verify: "Verifying...", password: "Resetting..." }[resetStage],
  }[mode]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">{heading}</h1>
        <p className="mt-3 text-sm text-zinc-400">{subheading}</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400"
        >
          <p>{error}</p>
        </motion.div>
      )}

      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400"
        >
          <p>{notice}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && signupStage === "details" && (
          <input
            type="text"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Full name"
            autoComplete="name"
            required
            minLength={2}
            className={inputClassName}
          />
        )}

        {showEmail && (
          <input
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
            autoComplete="email"
            required
            className={inputClassName}
          />
        )}

        {showOtp && (
          <input
            type="text"
            value={otp}
            onChange={event => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            required
            className={`${inputClassName} text-center tracking-[0.5em] font-mono text-lg`}
          />
        )}

        {showOtp && (
          <div className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-800/30 p-3">
            <Info className="mt-0.5 size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-zinc-500">
              The code comes from <span className="text-zinc-300">SDGP.LK</span>. If it is not in your
              inbox, check your spam or junk folder and mark it as{" "}
              <span className="text-zinc-300">Not spam</span> so future codes arrive normally.
            </p>
          </div>
        )}

        {showPassword && (
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder={mode === "signin" ? "Password" : "New password"}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={mode === "signin" ? undefined : 8}
            className={inputClassName}
          />
        )}

        {showConfirmPassword && (
          <input
            type="password"
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            placeholder="Confirm password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputClassName}
          />
        )}

        {mode === "signin" && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => switchMode("reset")}
              className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
            >
              Forgot password?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-zinc-100 px-5 py-3.5
            text-sm font-medium text-zinc-900
            transition-all duration-200 hover:bg-white
            active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40"
        >
          {loading ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900 shrink-0" />
              <span>{busyLabel}</span>
            </>
          ) : (
            <span>{submitLabel}</span>
          )}
        </button>
      </form>

      {showGoogle && (
        <>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-600">or</span>
            <span className="h-px flex-1 bg-zinc-800" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700
              bg-zinc-800 px-5 py-3.5 text-sm font-medium text-zinc-200
              transition-all duration-200 hover:bg-zinc-700 hover:border-zinc-600
              active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40"
          >
            {googleLoading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200 shrink-0" />
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.77 24c0-1.6.28-3.15.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.88.93 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </>
      )}

      <p className="text-center text-sm text-zinc-500">
        {mode === "reset" ? (
          <>
            Remembered it?{" "}
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="font-medium text-zinc-200 underline-offset-4 hover:underline"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
              className="font-medium text-zinc-200 underline-offset-4 hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Sign up"}
            </button>
          </>
        )}
      </p>
    </div>
  )
}

const RightPanel: React.FC = () => {
  const [current, setCurrent] = React.useState(0)
  const total = loginImages.length

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrent(prev => (prev + 1) % total)
    }, 5000)
    return () => window.clearTimeout(timer)
  }, [current, total])

  return (
    <div className="relative hidden sm:flex flex-col justify-between bg-zinc-950 overflow-hidden p-8">
      {/* Image carousel */}
      <div className="absolute inset-0">
        {loginImages.map((src, i) => (
          <img
            key={src}
            src={src}
            alt="Hero"
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-[1500ms] ease-out ${
              i === current ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25" />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top spacer — keeps layout consistent */}
      <div className="relative z-10" />

      {/* Bottom: dots + info card */}
      <div className="relative z-10">
        {/* Progress dots */}
        <div className="flex gap-2 mb-4">
          {loginImages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Show image ${i + 1}`}
              className="h-1 w-8 rounded-full overflow-hidden bg-white/15 hover:bg-white/25 transition-colors duration-300 cursor-pointer"
            >
              <div
                className={`h-full bg-white rounded-full transition-all linear ${
                  i === current ? "w-full duration-[5000ms]" : "w-0 duration-0"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Info card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 backdrop-blur">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Platform</p>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            Manage your Software Development Group Project. Track progress, collaborate, and ship faster.
          </p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
            <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
              SDGP 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const BackgroundDecoration: React.FC = () => (
  <div className="fixed inset-0 bg-[radial-gradient(circle_800px_at_50%_50%,#18181b,transparent)]" />
)

export default AuthForm