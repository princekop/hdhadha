import React from 'react'
import { getDecorationUrl, DECORATION_STYLES } from '../lib/decorations'

export type AvatarProps = {
  src?: string | null
  alt?: string
  size?: number
  className?: string
  decorationSlug?: string | null
  rounded?: boolean
}

// Reusable avatar with optional decoration overlay (always on top)
export default function Avatar({ src, alt = 'Avatar', size = 48, className = '', decorationSlug, rounded = true }: AvatarProps) {
  const dimension = `${size}px`
  const radius = rounded ? '9999px' : '12px'
  const decoUrl = getDecorationUrl(decorationSlug)

  return (
    <div
      className={`relative inline-block ${className}`.trim()}
      style={{
        width: dimension,
        height: dimension,
        borderRadius: radius,
        overflow: 'hidden',
        boxSizing: 'border-box',
        // Strong cross-browser clipping
        WebkitClipPath: rounded ? 'circle(50% at 50% 50%)' : undefined,
        clipPath: rounded ? 'circle(50% at 50% 50%)' : undefined,
        backgroundColor: 'rgba(31,41,55,0.4)', // bg-gray-800/40
        transform: 'translateZ(0)',
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 w-full h-full flex items-center justify-center text-white/70 font-semibold"
          style={{ zIndex: 0 }}
        >
          {(alt || 'U').charAt(0).toUpperCase()}
        </div>
      )}

      {decoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={decoUrl}
          alt="Decoration"
          className="absolute inset-0 pointer-events-none select-none"
          style={{
            // Per-decoration inset to avoid edge collision/bleed
            ...(decorationSlug ? (() => {
              const pct = DECORATION_STYLES[decorationSlug!]?.insetPct ?? 6
              const inset = `${pct}%`
              const size = `${100 - pct * 2}%`
              return { inset, width: size, height: size }
            })() : { inset: '6%', width: '88%', height: '88%' }),
            objectFit: 'contain',
            zIndex: 1,
          }}
          loading="lazy"
        />
      )}
    </div>
  )
}
