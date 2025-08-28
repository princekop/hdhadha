import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

// PATCH: set or clear timeout for a member in a server
// body: { durationMinutes?: number } if omitted or 0 => clear
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ serverId: string, userId: string }> }) {
  const session = await getServerSession(authOptions)
  const requesterId = (session?.user as any)?.id as string | undefined
  const isGlobalAdmin = Boolean((session?.user as any)?.isAdmin)
  if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { serverId, userId } = await params
  if (!serverId || !userId) return NextResponse.json({ error: 'serverId and userId required' }, { status: 400 })

  try {
    const body = await req.json().catch(() => ({}))
    const durationMinutes = Number.isFinite(body?.durationMinutes) ? Number(body.durationMinutes) : undefined

    // Permission: server owner or global admin
    const server = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } })
    if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    if (!isGlobalAdmin && server.ownerId !== requesterId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const timeoutUntil = durationMinutes && durationMinutes > 0
      ? new Date(Date.now() + durationMinutes * 60 * 1000)
      : null

    const data: any = { timeoutUntil }
    await prisma.serverMember.updateMany({
      where: { serverId, userId },
      data,
    })

    return NextResponse.json({ ok: true, timeoutUntil })
  } catch (e) {
    console.error('Timeout member error:', e)
    return NextResponse.json({ error: 'Failed to set/clear timeout' }, { status: 500 })
  }
}
