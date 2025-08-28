import { NextResponse } from 'next/server'

// GitHub repo details for the CDN decorations
const OWNER = 'itspi3141'
const REPO = 'discord-fake-avatar-decorations'
const PATH = 'public/decorations'
const REF = 'main'

const GITHUB_CONTENTS_API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}?ref=${REF}`
const JSDELIVR_BASE = `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${REF}/${PATH}/`

export const revalidate = 3600 // 1 hour ISR for edge/static usage

export async function GET() {
  try {
    const res = await fetch(GITHUB_CONTENTS_API, {
      // Cache on server side to reduce rate limit pressure
      next: { revalidate },
      headers: {
        // Identify the app; unauthenticated requests have low rate limits (60/hr)
        'User-Agent': 'Darkbyte-App/decoration-list'
      }
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: 'GitHub fetch failed', status: res.status, body: text }, { status: 502 })
    }

    const data: Array<{ name: string; path: string; type: string }> = await res.json()

    const items = data
      .filter(item => item.type === 'file' && /\.(png|webp|gif|jpg|jpeg|svg)$/i.test(item.name))
      .map(item => {
        const filename = item.name
        const slug = filename.replace(/\.[^.]+$/, '')
        return {
          slug,
          name: slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          url: `${JSDELIVR_BASE}${filename}`
        }
      })

    return NextResponse.json({ items, count: items.length, source: 'github:contents', path: PATH })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unexpected error', message: err?.message || String(err) }, { status: 500 })
  }
}
