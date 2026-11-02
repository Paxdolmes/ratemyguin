"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Search, UserMinus, UserPlus } from "lucide-react"
import { favourites, findPeople, follow, following, friendsFeed, unfollow, type Favourite, type FeedItem, type Person } from "@/lib/live"
import { pubHref, timeAgo } from "@/lib/pubs"

export function Friends({ userId }: { userId: string }) {
  const [people, setPeople] = useState<Person[]>([])
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [text, setText] = useState("")
  const [found, setFound] = useState<Person[]>([])
  const [compare, setCompare] = useState<{ person: Person; theirs: Favourite[]; mine: Favourite[] } | null>(null)

  const load = async () => {
    const ps = await following(userId)
    setPeople(ps)
    setFeed(await friendsFeed(ps.map((p) => p.id)))
  }
  useEffect(() => {
    load().catch(() => {})
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => findPeople(text).then((xs) => setFound(xs.filter((x) => x.id !== userId))), 250)
    return () => clearTimeout(t)
  }, [text, userId])

  const openCompare = async (person: Person) => {
    const [theirs, mine] = await Promise.all([favourites(person.id), favourites(userId)])
    setCompare({ person, theirs, mine })
  }
  const followingIds = new Set(people.map((p) => p.id))

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="flex flex-col gap-5 lg:w-[380px] lg:shrink-0">
        <div className="flex h-11 items-center gap-2 rounded-full border border-border bg-paper px-4 focus-within:outline-2 focus-within:outline-pub">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Find people by @handle" className="w-full bg-transparent outline-none" />
        </div>
        {found.length > 0 && (
          <ul className="flex flex-col rounded-2xl border border-border">
            {found.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5 first:border-t-0">
                <span className="text-sm">
                  <span className="font-semibold">{p.name}</span> <span className="text-muted-foreground">@{p.handle}</span>
                </span>
                {followingIds.has(p.id) ? (
                  <span className="text-xs text-muted-foreground">Following</span>
                ) : (
                  <button type="button" onClick={() => follow(userId, p.id).then(load)} className="inline-flex items-center gap-1 text-sm font-semibold text-pub hover:underline">
                    <UserPlus className="size-4" aria-hidden="true" /> Follow
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2">
          <h3 className="font-display text-xl font-semibold">Following</h3>
          {people.length === 0 ? (
            <p className="text-sm text-muted-foreground">Follow people whose taste you trust to see their pints here.</p>
          ) : (
            <ul className="flex flex-col">
              {people.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 border-t border-border py-2.5">
                  <button type="button" onClick={() => openCompare(p)} className="text-left text-sm hover:underline">
                    <span className="font-semibold">{p.name}</span> <span className="text-muted-foreground">@{p.handle}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => unfollow(userId, p.id).then(load)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Unfollow ${p.name}`}
                  >
                    <UserMinus className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {compare && (
          <div className="flex flex-col gap-4 rounded-2xl bg-cream p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-2xl font-semibold">You and {compare.person.name}</h3>
              <button type="button" onClick={() => setCompare(null)} className="text-sm text-muted-foreground hover:text-foreground">
                Close
              </button>
            </div>
            {(() => {
              const mine = new Set(compare.mine.map((f) => f.pub_id))
              const both = compare.theirs.filter((f) => mine.has(f.pub_id))
              return (
                <>
                  {both.length > 0 && (
                    <p className="text-sm">
                      <span className="font-semibold">You both rate:</span> {both.map((f) => f.name).join(", ")}
                    </p>
                  )}
                  {compare.theirs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No favourites to show yet.</p>
                  ) : (
                    <ol className="flex flex-col">
                      {compare.theirs.slice(0, 5).map((f, i) => (
                        <li key={f.pub_id} className="flex items-center justify-between border-t border-stout/10 py-2 text-sm">
                          <Link href={pubHref({ slug: f.pub_id })} className="hover:underline">
                            {i + 1}. {f.name} <span className="text-muted-foreground">· {f.city}</span>
                          </Link>
                          <span className="font-display text-lg font-semibold tabular-nums">{f.average.toFixed(1)}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              )
            })()}
          </div>
        )}
        <h3 className="font-display text-2xl font-semibold">Friends&apos; pints</h3>
        {feed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet. Their ratings appear here as they rate.</p>
        ) : (
          <ul className="flex flex-col">
            {feed.map((f) => (
              <li key={f.id} className="flex items-center gap-3 border-t border-border py-3">
                {f.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.photoUrl} alt="" className="h-14 w-10 rounded-md object-cover" />
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm">
                    <span className="font-semibold">{f.who}</span> rated{" "}
                    <Link href={pubHref({ slug: f.pubId })} className="font-semibold hover:underline">
                      {f.pubName}
                    </Link>
                  </span>
                  {f.note && <span className="truncate text-sm text-muted-foreground">{f.note}</span>}
                  <span className="text-xs text-muted-foreground">{timeAgo(f.at)}</span>
                </div>
                <span className="font-display text-2xl font-semibold tabular-nums">{f.overall.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
