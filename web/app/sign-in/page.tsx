"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { GlassMark } from "@/components/brand/glass-mark"
import { isAdult } from "@/lib/age"
import { myProfile, supabase, useSession } from "@/lib/live"

const field = "h-12 rounded-xl border border-border bg-paper px-4 focus-visible:outline-2 focus-visible:outline-pub"
const button = "mt-2 inline-flex h-12 items-center justify-center rounded-full bg-stout font-semibold text-cream hover:bg-pub disabled:opacity-50"

function SignIn() {
  const router = useRouter()
  const next = useSearchParams().get("next") || "/"
  const { session, ready } = useSession()
  const [step, setStep] = useState<"email" | "code" | "profile" | "checking">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [handle, setHandle] = useState("")
  const [dob, setDob] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Signed in already: go on, unless they still need a handle.
  useEffect(() => {
    if (!ready || !session) return
    setStep("checking")
    myProfile(session.user.id).then((p) => (p ? router.replace(next) : setStep("profile")))
  }, [ready, session, next, router])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-14 md:py-20">
      <div className="flex flex-col items-center gap-4 text-center">
        <GlassMark size={64} tone="onLight" title="" />
        <h1 className="font-display text-4xl font-semibold">
          {step === "profile" ? "Pick your handle" : step === "code" ? "Check your email" : "Sign in or sign up"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {step === "profile"
            ? "It goes on your pint cards and your Passport."
            : step === "code"
              ? `We sent a code to ${email}. It can take a minute to arrive.`
              : "We'll email you a code. No password needed."}
        </p>
      </div>

      {step === "email" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            run(async () => {
              const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } })
              if (error) throw error
              setStep("code")
            })
          }}
        >
          <label htmlFor="email" className="text-sm font-semibold">
            Email
          </label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          <button type="submit" disabled={busy} className={button}>
            {busy ? "Sending…" : "Email me a code"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            run(async () => {
              const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" })
              if (error) throw error
            })
          }}
        >
          <label htmlFor="code" className="text-sm font-semibold">
            Code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className={`${field} font-display text-2xl tracking-[0.3em]`}
          />
          <button type="submit" disabled={busy || code.length < 6} className={button}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button type="button" onClick={() => setStep("email")} className="text-sm font-semibold text-pub hover:underline">
            Use a different email
          </button>
        </form>
      )}

      {step === "profile" && session && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            run(async () => {
              if (!isAdult(dob)) throw new Error("Sorry, ratemyGuin is only for people aged 18 and over.")
              const { error } = await supabase
                .from("profiles")
                .insert({ id: session.user.id, handle, display_name: name.trim(), adult_confirmed_at: new Date().toISOString() })
              if (error?.code === "23505") throw new Error("That handle is taken. Try another.")
              if (error) throw error
              router.replace(next)
            })
          }}
        >
          <label htmlFor="name" className="text-sm font-semibold">
            Your name
          </label>
          <input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
          <label htmlFor="handle" className="text-sm font-semibold">
            Handle
          </label>
          <input
            id="handle"
            required
            pattern="[a-z0-9_]{3,20}"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
            className={field}
          />
          <span className="text-xs text-muted-foreground">3 to 20 lower-case letters, numbers or underscores.</span>
          <label htmlFor="dob" className="text-sm font-semibold">
            Date of birth
          </label>
          <input id="dob" type="date" required autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={dob} onChange={(e) => setDob(e.target.value)} className={field} />
          <span className="text-xs text-muted-foreground">We only check you&apos;re 18 or over. We don&apos;t keep your date of birth.</span>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 size-4 accent-[var(--pub)]" />
            <span>
              I agree to the{" "}
              <Link href="/terms/" className="font-semibold text-pub hover:underline">terms</Link> and{" "}
              <Link href="/privacy/" className="font-semibold text-pub hover:underline">privacy policy</Link>.
            </span>
          </label>
          <button type="submit" disabled={busy || name.trim().length < 2 || !/^[a-z0-9_]{3,20}$/.test(handle) || !dob || !agreed} className={button}>
            Continue
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground">You must be 18 or over to use ratemyGuin.</p>
    </main>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  )
}
