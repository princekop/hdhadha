import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const servers = await prisma.server.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { members: true } },
      owner: { select: { id: true, username: true, displayName: true } },
    },
  })
  return NextResponse.json(servers.map(s => ({
    id: s.id,
    name: s.name,
    tag: (s as any).tag ?? null,
    byteeLevel: (s as any).byteeLevel ?? 0,
    members: s._count.members,
    owner: s.owner,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const { name, ownerId, description, icon, banner, tag } = body || {}
    if (!name || !ownerId) {
      return NextResponse.json({ error: 'name and ownerId are required' }, { status: 400 })
    }
    const server = await prisma.server.create({
      data: {
        name,
        ownerId,
        description: description ?? null,
        icon: icon ?? null,
        banner: banner ?? null,
        tag: tag ?? null,
      },
    })
    // ensure owner is a member with role 'owner'
    await prisma.serverMember.create({ data: { userId: ownerId, serverId: server.id, role: 'owner' } })
    return NextResponse.json({ id: server.id })
  } catch (e) {
    console.error('Admin create server error:', e)
    return NextResponse.json({ error: 'Failed to create server' }, { status: 500 })
  }
}
