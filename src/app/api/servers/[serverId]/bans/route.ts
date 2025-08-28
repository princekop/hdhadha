import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

// GET: list bans for a server (owner or global admin required)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const session = await getServerSession(authOptions)
  const requesterId = (session?.user as any)?.id as string | undefined
  const isGlobalAdmin = Boolean((session?.user as any)?.isAdmin)
  if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { serverId } = await params
  if (!serverId) return NextResponse.json({ error: 'serverId required' }, { status: 400 })

  try {
    const server = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } })
    if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    if (!isGlobalAdmin && server.ownerId !== requesterId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bans = await prisma.serverBan.findMany({
      where: { serverId },
      orderBy: { createdAt: 'desc' },
      include: {
        bannedUser: { select: { id: true, username: true, displayName: true, avatar: true } },
        banner: { select: { id: true, username: true, displayName: true } },
      },
    })

    return NextResponse.json(bans.map((b: any) => ({
      id: b.id,
      user: {
        id: b.bannedUser?.id,
        username: b.bannedUser?.username,
        displayName: b.bannedUser?.displayName,
        avatar: b.bannedUser?.avatar ?? null,
      },
      bannedBy: b.banner ? { id: b.banner.id, username: b.banner.username, displayName: b.banner.displayName } : null,
      reason: b.reason ?? null,
      createdAt: b.createdAt,
      expiresAt: b.expiresAt ?? null,
    })))
  } catch (e) {
    console.error('List bans error:', e)
    return NextResponse.json({ error: 'Failed to list bans' }, { status: 500 })
  }
}
