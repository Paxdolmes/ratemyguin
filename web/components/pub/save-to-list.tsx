"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Bookmark, BookmarkCheck, Plus } from "lucide-react"
import { addToList, createList, myLists, removeFromList, useSession, type SavedList } from "@/lib/live"

export function SaveToList({ pubId }: { pubId: string }) {
  const { session } = useSession()
  const [open, setOpen] = useState(false)
  const [lists, setLists] = useState<SavedList[]>([])
  const [name, setName] = useState("")
  const box = useRef<HTMLDivElement>(null)
  const load = () => session && myLists(session.user.id).then(setLists).catch(() => {})
  useEffect(() => {
    load()
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const saved = lists.some((l) => l.pubs.some((p) => p.id === pubId))
  const cls = "inline-flex items-center gap-1.5 font-semibold text-pub hover:underline"
  if (!session)
    return (
      <Link href={`/sign-in/?next=${encodeURIComponent(`/pub/?id=${pubId}`)}`} className={cls}>
        <Bookmark className="size-4" aria-hidden="true" /> Save
      </Link>
    )

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={cls}>
        {saved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
        {saved ? "Saved" : "Save"}
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-20 flex w-72 flex-col gap-1 rounded-2xl border border-border bg-paper p-2 shadow-lg">
          {lists.map((l) => {
            const on = l.pubs.some((p) => p.id === pubId)
            return (
              <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-cream">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => (on ? removeFromList(l.id, pubId) : addToList(l.id, pubId)).then(load)}
                  className="size-4 accent-[var(--pub)]"
                />
                {l.name}
              </label>
            )
          })}
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!name.trim()) return
              const id = await createList(name.trim())
              await addToList(id, pubId)
              setName("")
              load()
            }}
            className="flex gap-1 border-t border-border pt-2"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              placeholder="New list"
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-paper px-2 text-sm outline-none"
            />
            <button type="submit" className="inline-flex size-9 items-center justify-center rounded-lg bg-stout text-cream" aria-label="Create list">
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
