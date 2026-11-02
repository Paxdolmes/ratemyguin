import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Figtree } from 'next/font/google'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import './globals.css'

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage' })
const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree' })

export const metadata: Metadata = {
  title: {
    default: 'ratemyguin — The best pint near you',
    template: '%s · ratemyguin',
  },
  description:
    'The independent league table of pubs ranked by how good their pint of Guinness is. Excellence Index scores, verified pint ratings and the Guin Passport.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#17110D',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en-GB" className={`${bricolage.variable} ${figtree.variable} bg-background`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  )
}
