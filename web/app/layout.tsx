import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Jost } from 'next/font/google'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import './globals.css'

const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], style: ['normal', 'italic'], variable: '--font-cormorant' })
const jost = Jost({ subsets: ['latin'], variable: '--font-jost' })

export const metadata: Metadata = {
  title: {
    default: 'ratemyGuin — The best pint near you',
    template: '%s · ratemyGuin',
  },
  description:
    'The independent league table of pubs ranked by how good their pint of Guinness is. Excellence Index scores, verified pint ratings and the Guin Passport.',
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
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
    <html lang="en-GB" className={`${cormorant.variable} ${jost.variable} bg-background`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  )
}
