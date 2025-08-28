import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rlMessages, keyFromRequest } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _req: NextRequest,
  ctx: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = ctx.params
    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }

    // Rate limit by IP/UA
    const key = keyFromRequest(_req as unknown as Request)
    if (!(await rlMessages.take(key))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Cache-Control': 'no-store' } })
    }

    const messages = await prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        codeHtml: true,
        codeCss: true,
        codeJs: true,
        createdAt: true,
      }
    })

    return NextResponse.json(messages, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    console.error('GET /api/ai/conversations/[conversationId]/messages error', e)
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
