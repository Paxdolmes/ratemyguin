'use client'

import { useId } from 'react'
import { GlassGlyph } from './glass-mark'
import { BRAND, FONT_SANS, FONT_SERIF, svgSafeId } from './tokens'

const notched = (inset: number, cut: number, w = 260, h = 160) => {
  const l = inset
  const r = w - inset
  const t = inset
  const b = h - inset
  return `M ${l + cut} ${t} H ${r - cut} L ${r} ${t + cut} V ${b - cut} L ${r - cut} ${b} H ${l + cut} L ${l} ${b - cut} V ${t + cut} Z`
}

type PassportStampProps = {
  pub: string
  town: string
  date: string
  score: number
  number?: string
  ink?: string
  rotate?: number
  width?: number
  className?: string
}

export function PassportStamp({
  pub,
  town,
  date,
  score,
  number = '0001',
  ink = BRAND.gold,
  rotate = -4,
  width = 260,
  className,
}: PassportStampProps) {
  const id = svgSafeId(useId())
  return (
    <svg
      width={width}
      height={(width * 160) / 260}
      viewBox="0 0 260 160"
      role="img"
      aria-label={`Guin Passport stamp: ${pub}, ${town}, ${date}, scored ${score}`}
      className={className}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <defs>
        <filter id={`${id}-ink`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G" result="shifted" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.6 0 0 0 1.7" result="speckle" />
          <feComposite in="shifted" in2="speckle" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id}-ink)`} fill="none" stroke={ink}>
        <path d={notched(4, 12)} strokeWidth={2} />
        <path d={notched(10, 9)} strokeWidth={0.7} />

        <line x1={30} y1={34} x2={74} y2={34} strokeWidth={0.7} />
        <line x1={186} y1={34} x2={230} y2={34} strokeWidth={0.7} />
        <text x={130} y={38} textAnchor="middle" fill={ink} stroke="none" fontSize={10} letterSpacing={3.4} style={{ fontFamily: FONT_SANS, fontWeight: 500 }}>
          GUIN PASSPORT
        </text>

        <text x={130} y={74} textAnchor="middle" fill={ink} stroke="none" fontSize={25} style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 600 }}>
          {pub}
        </text>
        <text x={130} y={94} textAnchor="middle" fill={ink} stroke="none" fontSize={9} letterSpacing={2.6} style={{ fontFamily: FONT_SANS, fontWeight: 500 }}>
          {`${town} · ${date}`.toUpperCase()}
        </text>

        <line x1={30} y1={108} x2={230} y2={108} strokeWidth={0.7} />

        <GlassGlyph x={34} y={114} height={30} stroke={ink} body="none" head="none" strokeWidth={2} />
        <text x={58} y={136} fill={ink} stroke="none" fontSize={9} letterSpacing={2.2} style={{ fontFamily: FONT_SANS, fontWeight: 500 }}>
          {`NO. ${number}`}
        </text>
        <text x={226} y={138} textAnchor="end" fill={ink} stroke="none" fontSize={24} style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontVariantNumeric: 'lining-nums' }}>
          {score}
          <tspan fontSize={10} dx={2} style={{ fontFamily: FONT_SANS, fontWeight: 500 }}>
            /100
          </tspan>
        </text>
      </g>
    </svg>
  )
}
