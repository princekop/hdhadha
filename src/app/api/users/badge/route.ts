import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

// Set or clear the current user's chosen badge server
// PUT /api/users/badge  { serverId: string | null }
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meId = (session.user as any).id as string

  const body = await req.json().catch(() => ({}))
  const { serverId } = body || {}

  if (serverId !== null && typeof serverId !== 'string') {
    return NextResponse.json({ error: 'Invalid serverId' }, { status: 400 })
  }

  // If clearing selection
  if (serverId === null) {
    const updated = await prisma.user.update({
      where: { id: meId },
      data: { badgeServerId: null },
      select: { id: true, badgeServerId: true },
    })
    return NextResponse.json({ id: updated.id, badgeServerId: updated.badgeServerId })
  }

  // Validate server exists and the user is a member
  const server = await prisma.server.findUnique({ where: { id: serverId } })
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })

  const membership = await prisma.serverMember.findFirst({ where: { userId: meId, serverId } })
  if (!membership) return NextResponse.json({ error: 'Not a member of this server' }, { status: 403 })

  const updated = await prisma.user.update({
    where: { id: meId },
    data: { badgeServerId: serverId },
    select: { id: true, badgeServerId: true },
  })
  return NextResponse.json({ id: updated.id, badgeServerId: updated.badgeServerId })
}
