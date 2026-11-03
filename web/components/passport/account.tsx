"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { blockedCount, deleteMyAccount, supabase, unblockAll } from "@/lib/live"

export function Account({ userId, email }: { userId: string; email?: string }) {
  const router = useRouter()
  const [blocked, setBlocked] = useState(0)
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  useEffect(() => {
    blockedCount().then(setBlocked)
  }, [])
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-3xl font-semibold">Account</h2>
        {email && <p className="text-sm text-muted-foreground">Signed in as {email}</p>}
        <div className="flex flex-wrap gap-3 pt-2 text-sm">
          <Link href="/privacy/" className="font-semibold text-pub hover:underline">Privacy policy</Link>
          <Link href="/terms/" className="font-semibold text-pub hover:underline">Terms</Link>
          <Link href="/support/" className="font-semibold text-pub hover:underline">Help and contact</Link>
        </div>
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut()
            router.replace("/")
          }}
          className="mt-2 h-11 w-fit rounded-full border border-stout px-5 font-semibold hover:bg-cream"
        >
          Sign out
        </button>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-6">
        <h3 className="font-display text-2xl font-semibold">Blocked people</h3>
        <p className="text-sm text-muted-foreground">
          {blocked === 0 ? "You haven't blocked anyone. Use “Block” on a rating to stop seeing that person's pints." : `You've blocked ${blocked} ${blocked === 1 ? "person" : "people"}.`}
        </p>
        {blocked > 0 && (
          <button type="button" onClick={() => unblockAll().then(() => setBlocked(0))} className="h-10 w-fit rounded-full border border-border px-4 text-sm font-semibold hover:bg-cream">
            Unblock everyone
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-destructive/30 p-5">
        <h3 className="font-display text-2xl font-semibold">Delete your account</h3>
        <p className="text-sm">
          This deletes your profile, every rating and photo you&apos;ve added, your lists and who you follow. It can&apos;t be undone.
        </p>
        <label className="flex flex-col gap-1 text-sm">
          Type <b>delete</b> to confirm
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11 w-48 rounded-xl border border-border bg-paper px-3" />
        </label>
        <button
          type="button"
          disabled={confirm.trim().toLowerCase() !== "delete" || busy}
          onClick={async () => {
            setBusy(true)
            setProblem(null)
            try {
              await deleteMyAccount(userId)
              router.replace("/?deleted=1")
            } catch {
              setProblem("Something went wrong. Please try again, or contact us from the help page.")
              setBusy(false)
            }
          }}
          className="h-11 w-fit rounded-full bg-destructive px-5 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Delete my account"}
        </button>
        {problem && <p className="text-sm text-destructive">{problem}</p>}
      </div>
    </div>
  )
}
