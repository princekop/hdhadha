import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, icon, banner, ownerId } = body

    if (!name || !ownerId) {
      return NextResponse.json(
        { error: 'Name and ownerId are required' },
        { status: 400 }
      )
    }

    // Enforce single server per user (owner). For more, require membership purchase.
    const ownedCount = await prisma.server.count({ where: { ownerId } })
    if (ownedCount >= 1) {
      return NextResponse.json(
        { error: 'Server creation limit reached. Purchase Byte membership to create more servers.' },
        { status: 402 }
      )
    }

    // Create server
    const server = await prisma.server.create({
      data: {
        name,
        description: description || '',
        icon: icon || name.substring(0, 2).toUpperCase(),
        ownerId,
      },
    })

    // Add owner as first member
    await prisma.serverMember.create({
      data: {
        userId: ownerId,
        serverId: server.id,
        role: 'owner',
      },
    })

    return NextResponse.json(server)
  } catch (error) {
    console.error('Server creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create server' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const discover = searchParams.get('discover')

    // Discover directory: admin-curated servers (by tag) and/or advertised
    if (discover) {
      const q = (searchParams.get('q') || '').trim()
      const category = (searchParams.get('category') || '').trim()

      // Map of UI categories -> tag values
      const categoryMap: Record<string, string> = {
        'Free hosting': 'free-hosting',
        'Paid hosting': 'paid-hosting',
        'Free & paid hosting': 'free-paid-hosting',
        'Indian hosting': 'indian-hosting',
        'AI': 'ai',
        'Setups': 'setups',
        'More': 'more',
      }
      const tagFilter = category && categoryMap[category] ? categoryMap[category] : undefined

      const servers = await prisma.server.findMany({
        where: {
          // Admin curated: either tagged OR explicitly advertised
          OR: [
            { NOT: [{ tag: null }] },
            { advertisementEnabled: true },
          ],
          ...(tagFilter ? { tag: tagFilter } : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { description: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          _count: { select: { members: true } },
        },
        orderBy: [{ members: { _count: 'desc' } } as any, { createdAt: 'desc' }],
      })

      const result = servers.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
        banner: s.banner,
        members: (s as any)._count?.members ?? 0,
        tags: s.tag ? [s.tag] : [],
        advertisementEnabled: (s as any).advertisementEnabled ?? false,
        advertisementText: (s as any).advertisementText ?? null,
      }))
      return NextResponse.json(result)
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get user's servers (owned and joined)
    const userServers = await prisma.serverMember.findMany({
      where: {
        userId,
      },
      include: {
        server: {
          include: {
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
    })

    const servers = userServers.map(member => ({
      id: member.server.id,
      name: member.server.name,
      description: member.server.description,
      icon: member.server.icon,
      banner: member.server.banner,
      isActive: true, // You can add logic to determine if server is active
      type: member.role === 'owner' ? 'owned' : 'joined',
      members: member.server._count.members,
      ownerId: member.server.ownerId,
    }))

    return NextResponse.json(servers)
  } catch (error) {
    console.error('Get servers error:', error)
    return NextResponse.json(
      { error: 'Failed to get servers' },
      { status: 500 }
    )
  }
} 