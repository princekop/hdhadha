import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

// POST: ban a member from a server
// body: { reason?: string, durationMinutes?: number } duration optional for temp ban
export async function POST(req: NextRequest, { params }: { params: Promise<{ serverId: string, userId: string }> }) {
  const session = await getServerSession(authOptions)
  const requesterId = (session?.user as any)?.id as string | undefined
  const isGlobalAdmin = Boolean((session?.user as any)?.isAdmin)
  if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { serverId, userId } = await params
  if (!serverId || !userId) return NextResponse.json({ error: 'serverId and userId required' }, { status: 400 })
  if (userId === requesterId) return NextResponse.json({ error: 'Cannot ban yourself' }, { status: 400 })

  try {
    const body = await req.json().catch(() => ({}))
    const reason = body?.reason as string | undefined
    const durationMinutes = Number.isFinite(body?.durationMinutes) ? Number(body.durationMinutes) : undefined
    const expiresAt = durationMinutes && durationMinutes > 0 ? new Date(Date.now() + durationMinutes * 60 * 1000) : null

    // Permission: server owner or global admin
    const server = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } })
    if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    if (!isGlobalAdmin && server.ownerId !== requesterId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create/Upsert ban
    await (prisma as any).serverBan.upsert({
      where: { serverId_userId: { serverId, userId } } as any,
      create: { serverId, userId, bannedBy: requesterId, reason: reason ?? null, expiresAt },
      update: { bannedBy: requesterId, reason: reason ?? null, expiresAt },
    })

    // Remove from members if present
    await prisma.serverMember.deleteMany({ where: { serverId, userId } })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Ban member error:', e)
    return NextResponse.json({ error: 'Failed to ban member' }, { status: 500 })
  }
}

// DELETE: unban a user from a server
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ serverId: string, userId: string }> }) {
  const session = await getServerSession(authOptions)
  const requesterId = (session?.user as any)?.id as string | undefined
  const isGlobalAdmin = Boolean((session?.user as any)?.isAdmin)
  if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { serverId, userId } = await params
  if (!serverId || !userId) return NextResponse.json({ error: 'serverId and userId required' }, { status: 400 })

  try {
    const server = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } })
    if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    if (!isGlobalAdmin && server.ownerId !== requesterId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await (prisma as any).serverBan.deleteMany({ where: { serverId, userId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Unban member error:', e)
    return NextResponse.json({ error: 'Failed to unban member' }, { status: 500 })
  }
}
