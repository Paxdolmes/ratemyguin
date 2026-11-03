"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { BadgeCheck, Eye, EyeOff } from "lucide-react"
import { myDiary, profileSettings, setProfilePublic, setRatingAnonymous, type DiaryEntry } from "@/lib/live"
import { TAGS, pubHref } from "@/lib/pubs"

export function Diary({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null)
  const [isPublic, setIsPublic] = useState<boolean | null>(null)
  useEffect(() => {
    myDiary(userId).then(setEntries).catch(() => setEntries([]))
    profileSettings(userId).then((p) => setIsPublic(p?.is_public ?? true))
  }, [userId])

  const togglePublic = async () => {
    const next = !isPublic
    setIsPublic(next)
    await setProfilePublic(userId, next).catch(() => setIsPublic(!next))
  }
  const toggleAnon = async (e: DiaryEntry) => {
    setEntries((xs) => xs?.map((x) => (x.id === e.id ? { ...x, anonymous: !e.anonymous } : x)) ?? null)
    await setRatingAnonymous(e.id, !e.anonymous).catch(() => {})
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-paper p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-display text-lg font-semibold">Who can see your pints</span>
          <span className="text-sm text-muted-foreground">
            {isPublic === false
              ? "Private: only people you follow back can see your name on your ratings. Scores still count."
              : "Public: your name shows on your ratings. You can hide it on any single pint below."}
          </span>
        </div>
        <button
          type="button"
          onClick={togglePublic}
          disabled={isPublic === null}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-stout px-4 text-sm font-semibold hover:bg-cream"
        >
          {isPublic === false ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          {isPublic === false ? "Private" : "Public"}
        </button>
      </div>

      {entries === null ? (
        <div className="h-32 animate-pulse rounded-2xl bg-cream" />
      ) : entries.length === 0 ? (
        <p className="text-muted-foreground">
          Your diary fills up as you rate. <Link href="/rate/" className="font-semibold text-pub hover:underline">Rate your first pint</Link>.
        </p>
      ) : (
        <ol className="flex flex-col">
          {entries.map((e) => (
            <li key={e.id} className="flex gap-4 border-b border-border py-5 first:pt-0">
              {e.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.photoUrl} alt="" className="h-24 w-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-24 w-16 shrink-0 flex-col overflow-hidden rounded-lg bg-stout" aria-hidden="true">
                  <div className="h-4 bg-cream" />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <Link href={pubHref({ slug: e.pubId })} className="truncate font-display text-xl font-semibold hover:underline">
                      {e.pubName}
                    </Link>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {e.area} · {new Date(e.visitedOn ?? e.ratedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {e.verified && <BadgeCheck className="size-3.5 text-pub" aria-label="Verified" />}
                    </span>
                  </div>
                  <span className="font-display text-3xl font-semibold tabular-nums">{e.overall.toFixed(1)}</span>
                </div>
                {e.note && <p className="text-sm leading-relaxed">{e.note}</p>}
                {e.tags.length > 0 && <p className="text-xs text-muted-foreground">{e.tags.map((t) => TAGS[t]?.label ?? t).join(" · ")}</p>}
                <button type="button" onClick={() => toggleAnon(e)} className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  {e.anonymous ? <EyeOff className="size-3" aria-hidden="true" /> : <Eye className="size-3" aria-hidden="true" />}
                  {e.anonymous ? "Shown without your name" : "Shown with your name"}
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
