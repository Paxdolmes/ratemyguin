"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { RateForm } from "@/components/rate/rate-form"

function Rate() {
  const pub = useSearchParams().get("pub") ?? undefined
  return <RateForm key={pub ?? "default"} initialSlug={pub} />
}

export default function RatePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 pb-16 pt-8 md:px-8 md:pt-12">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pub">Rate a pint</p>
        <h1 className="font-display text-4xl font-semibold leading-[0.95] text-balance md:text-6xl">
          How was the pint?
        </h1>
      </div>
      <Suspense>
        <Rate />
      </Suspense>
    </main>
  )
}
