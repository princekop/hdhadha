import React, { useEffect, useMemo, useRef } from 'react'

// ProfileEffect: renders floating decorative images (e.g., leaves) around a child (avatar)
// Usage:
// <ProfileEffect images={["/uploads/leaves/leaf1.png", "/uploads/leaves/leaf2.png"]} size={84}>
//   <Avatar .../>
// </ProfileEffect>

type ProfileEffectProps = {
  images: string[]
  size?: number // square size for child container
  density?: number // number of sprites
  className?: string
  children: React.ReactNode
}

const rand = (min: number, max: number) => Math.random() * (max - min) + min

export default function ProfileEffect({
  images,
  size = 84,
  density = 8,
  className,
  children,
}: ProfileEffectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const spritesRef = useRef<HTMLDivElement[]>([])
  const rafRef = useRef<number | null>(null)

  // Prepare sprite configs once
  const configs = useMemo(() => {
    const items = Array.from({ length: Math.max(0, density) }).map(() => ({
      img: images[Math.floor(Math.random() * images.length)],
      x: rand(-20, 100),
      y: rand(-10, 110),
      z: rand(0, 1),
      rot: rand(-20, 20),
      scale: rand(0.5, 1),
      speedX: rand(-0.02, 0.02),
      speedY: rand(-0.03, -0.015), // drift upward slowly
      speedR: rand(-0.02, 0.02),
    }))
    return items
  }, [images, density])

  useEffect(() => {
    if (!containerRef.current || images.length === 0) return

    const step = () => {
      spritesRef.current.forEach((el, i) => {
        const c = configs[i]
        if (!el || !c) return
        c.x += c.speedX
        c.y += c.speedY
        c.rot += c.speedR
        // wrap around
        if (c.y < -20) c.y = 110
        if (c.x < -30) c.x = 110
        if (c.x > 120) c.x = -20
        el.style.transform = `translate3d(${c.x}%, ${c.y}%, 0) rotate(${c.rot}deg) scale(${c.scale})`
        el.style.opacity = String(0.35 + c.z * 0.45)
      })
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [configs, images.length])

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className || ''}`}
      style={{ width: size, height: size }}
    >
      {/* Aura ring */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none">
        <div className="absolute inset-0 rounded-2xl blur-xl opacity-40 bg-gradient-to-br from-sky-400/30 via-emerald-300/20 to-fuchsia-400/30" />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/15" />
      </div>

      {/* Child (avatar) */}
      <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden">
        {children}
      </div>

      {/* Floating sprites */}
      {images.length > 0 && configs.map((c, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) spritesRef.current[i] = el
          }}
          className="absolute will-change-transform select-none pointer-events-none drop-shadow"
          style={{
            left: 0,
            top: 0,
            width: size * 0.45,
            height: size * 0.45,
            transform: `translate3d(${c.x}%, ${c.y}%, 0) rotate(${c.rot}deg) scale(${c.scale})`,
            transformOrigin: 'center',
            filter: 'drop-shadow(0 6px 18px rgba(0,0,0,.35))',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.img} alt="" className="w-full h-full object-contain opacity-80" />
        </div>
      ))}

      {/* Foreground shine */}
      <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-tr from-white/5 to-transparent" />
    </div>
  )
}
