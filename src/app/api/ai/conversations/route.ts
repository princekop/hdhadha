import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    // Return latest conversation or create a new one
    let convo = await prisma.aiConversation.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true }
    })

    if (!convo) {
      convo = await prisma.aiConversation.create({
        data: { userId, title: 'New AI Chat' },
        select: { id: true, title: true, createdAt: true, updatedAt: true }
      })
    }

    return NextResponse.json(convo)
  } catch (e: any) {
    console.error('GET /api/ai/conversations error', e)
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, title } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const convo = await prisma.aiConversation.create({
      data: { userId, title: title || 'New AI Chat' },
      select: { id: true, title: true, createdAt: true, updatedAt: true }
    })

    return NextResponse.json(convo, { status: 201 })
  } catch (e: any) {
    console.error('POST /api/ai/conversations error', e)
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 })
  }
}
