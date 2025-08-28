/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Darkbyte Invite'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

async function fetchMeta(code: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || ''
  try {
    const res = await fetch(`${base}/api/invites/${code}`, { cache: 'no-store' })
    if (res.ok) return await res.json()
  } catch {}
  return null
}

export default async function Image({ params }: { params: { code: string } }) {
  const data = await fetchMeta(params.code)
  const s = data?.server || data || {}
  const name = s.name || 'Join this Darkbyte server'
  const description = s.description || 'A premium community on Darkbyte. Tap to join.'
  const banner = s.banner || s.bannerUrl || ''
  const icon = s.icon || s.iconUrl || ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: 'linear-gradient(135deg, #0b0d12 0%, #141821 50%, #0b0d12 100%)',
          color: 'white',
          fontFamily: 'Inter, ui-sans-serif, system-ui',
        }}
      >
        {/* Banner layer */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.85 }}>
          {banner ? (
            <img src={banner} alt="banner" width={1200} height={630} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'radial-gradient(80% 60% at 50% 40%, rgba(124,58,237,0.35) 0%, rgba(56,189,248,0.25) 40%, rgba(0,0,0,0.25) 100%)' }} />
          )}
        </div>
        {/* Overlays */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.6) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 4px rgba(125,249,255,0.25), inset 0 0 120px rgba(124,58,237,0.25)' }} />

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 32, padding: 56, zIndex: 10 }}>
          <div style={{ width: 120, height: 120, borderRadius: 28, overflow: 'hidden', border: '4px solid rgba(125,249,255,0.65)', background: 'rgba(0,0,0,0.35)' }}>
            {icon ? (
              <img src={icon} alt="icon" width={120} height={120} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 900 }}>SV</div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 56, fontWeight: 900, background: 'linear-gradient(90deg, #e9d5ff, #7df9ff, #a7f3d0)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{name}</div>
            <div style={{ marginTop: 12, fontSize: 28, color: 'rgba(255,255,255,0.9)' }}>{description}</div>
            <div style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.45)', padding: '12px 20px', borderRadius: 9999, border: '1px solid rgba(125,249,255,0.35)' }}>
              <div style={{ width: 10, height: 10, background: '#22c55e', borderRadius: 9999 }} />
              <div style={{ fontSize: 22 }}>Invite • Tap to Join</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, headers: { 'cache-control': 'no-store' } }
  )
}
