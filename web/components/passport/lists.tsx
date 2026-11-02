"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Globe, Lock, Plus, Trash2, X } from "lucide-react"
import { createList, deleteList, myLists, removeFromList, setListPublic, type SavedList } from "@/lib/live"
import { pubHref } from "@/lib/pubs"

export function Lists({ userId }: { userId: string }) {
  const [lists, setLists] = useState<SavedList[] | null>(null)
  const [name, setName] = useState("")
  const load = () => myLists(userId).then(setLists).catch(() => setLists([]))
  useEffect(() => {
    load()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await createList(name.trim())
    setName("")
    load()
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={add} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 60))}
          placeholder="New list, e.g. Best after-work pint"
          className="h-11 flex-1 rounded-full border border-border bg-paper px-4 outline-none focus-visible:outline-2 focus-visible:outline-pub"
        />
        <button type="submit" className="inline-flex h-11 items-center gap-1.5 rounded-full bg-stout px-4 font-semibold text-cream hover:bg-pub">
          <Plus className="size-4" aria-hidden="true" /> Create
        </button>
      </form>
      {lists === null ? (
        <div className="h-32 animate-pulse rounded-2xl bg-cream" />
      ) : lists.length === 0 ? (
        <p className="text-muted-foreground">Make a list, then use “Save” on any pub page to add to it.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {lists.map((l) => (
            <li key={l.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-paper p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-display text-xl font-semibold">{l.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {l.pubs.length} {l.pubs.length === 1 ? "pub" : "pubs"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setListPublic(l.id, !l.isPublic).then(load)}
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-2.5 text-xs font-medium hover:bg-cream"
                  >
                    {l.isPublic ? <Globe className="size-3.5" aria-hidden="true" /> : <Lock className="size-3.5" aria-hidden="true" />}
                    {l.isPublic ? "Shared" : "Private"}
                  </button>
                  <button
                    type="button"
                    onClick={() => confirm(`Delete “${l.name}”?`) && deleteList(l.id).then(load)}
                    className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-cream"
                    aria-label={`Delete ${l.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              {l.pubs.length > 0 && (
                <ul className="flex flex-col">
                  {l.pubs.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 border-t border-border py-2 text-sm">
                      <Link href={pubHref({ slug: p.id })} className="truncate font-medium hover:underline">
                        {p.name} <span className="text-muted-foreground">· {p.area}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeFromList(l.id, p.id).then(load)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${p.name}`}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
