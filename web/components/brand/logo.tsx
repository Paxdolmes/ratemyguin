import { cn } from '@/lib/utils'
import { GlassMark } from './glass-mark'

type LogoTone = 'onDark' | 'onLight'

type WordmarkProps = {
  tone?: LogoTone
  className?: string
}

export function Wordmark({ tone = 'onDark', className }: WordmarkProps) {
  return (
    <span
      className={cn(
        'font-serif font-medium leading-none tracking-[-0.015em]',
        tone === 'onDark' ? 'text-cream' : 'text-stout',
        className,
      )}
    >
      ratemy
      <span className={tone === 'onDark' ? 'text-gilt' : 'text-gold'}>Guin</span>
    </span>
  )
}

const SIZES = {
  sm: { glass: 28, text: 'text-2xl', gap: 'gap-2.5', tag: 'text-[0.55rem]' },
  md: { glass: 52, text: 'text-5xl', gap: 'gap-4', tag: 'text-[0.65rem]' },
  lg: { glass: 84, text: 'text-7xl', gap: 'gap-6', tag: 'text-xs' },
} as const

type LogoProps = {
  tone?: LogoTone
  size?: keyof typeof SIZES
  layout?: 'horizontal' | 'stacked'
  tagline?: string | false
  className?: string
}

export function Logo({
  tone = 'onDark',
  size = 'md',
  layout = 'horizontal',
  tagline = 'The Independent Pint Index',
  className,
}: LogoProps) {
  const s = SIZES[size]
  const stacked = layout === 'stacked'
  return (
    <div
      className={cn(
        'inline-flex',
        stacked ? 'flex-col items-center gap-5 text-center' : cn('items-center', s.gap),
        className,
      )}
    >
      <GlassMark size={stacked ? s.glass * 1.6 : s.glass} tone={tone} title="" />
      <div className={cn('flex flex-col gap-2', stacked && 'items-center')}>
        <Wordmark tone={tone} className={s.text} />
        {tagline && (
          <span
            className={cn(
              'font-sans font-medium uppercase tracking-[0.32em]',
              s.tag,
              tone === 'onDark' ? 'text-cream/60' : 'text-stout/60',
            )}
          >
            {tagline}
          </span>
        )}
      </div>
      <span className="sr-only">ratemyGuin</span>
    </div>
  )
}
