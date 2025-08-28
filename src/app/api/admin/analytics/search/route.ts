import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

// Minimal search tracking endpoint
// For now, it just logs searches server-side. Later we can persist to a Prisma model.
export async function POST(req: NextRequest) {
  try {
    // Admin-only: enforce admin guard for endpoints under /api/admin/**
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const userId: string = (session.user as any)?.id

    const { q, category } = await req.json().catch(() => ({}))
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'

    console.log('[DISCOVER_SEARCH]', {
      at: new Date().toISOString(),
      q: q || null,
      category: category || null,
      userId,
      ip,
      ua: req.headers.get('user-agent') || 'unknown',
    })

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error('Search tracking error:', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
