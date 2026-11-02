import { GlassGlyph } from './glass-mark'
import { BRAND } from './tokens'

type AppIconProps = {
  size?: number
  className?: string
}

export function AppIcon({ size = 120, className }: AppIconProps) {
  const showFrame = size >= 60
  const stroke = size >= 120 ? 1.5 : size >= 60 ? 2 : 2.8
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="ratemyGuin app icon"
      className={className}
    >
      <rect width="120" height="120" rx="27" fill={BRAND.stout} />
      {showFrame && (
        <rect
          x="7"
          y="7"
          width="106"
          height="106"
          rx="21"
          fill="none"
          stroke={BRAND.gilt}
          strokeOpacity={0.45}
          strokeWidth={0.6}
        />
      )}
      <GlassGlyph
        x={60 - 23.75}
        y={60 - 32 * 1.1875}
        height={76}
        stroke={BRAND.gilt}
        body={BRAND.stout}
        head={BRAND.gilt}
        strokeWidth={stroke}
      />
    </svg>
  )
}
