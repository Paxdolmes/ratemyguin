export const CONTACT_EMAIL = "hello@ratemyguin.com"

export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated?: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-col">
      <section className="bg-cream">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-10 md:px-8 md:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pub">{eyebrow}</p>
          <h1 className="font-display text-5xl font-semibold leading-[0.95]">{title}</h1>
          {updated && <p className="text-sm text-muted-foreground">Last updated {updated}</p>}
        </div>
      </section>
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10 text-[15px] leading-relaxed md:px-8 [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_a]:font-semibold [&_a]:text-pub [&_a:hover]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </article>
    </main>
  )
}
