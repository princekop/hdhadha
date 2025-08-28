import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { serverId, expiresIn, maxUses } = await request.json()

    // Check if user is a member of the server
    const serverMember = await prisma.serverMember.findFirst({
      where: {
        userId: session.user.id,
        serverId: serverId,
      },
    })

    if (!serverMember) {
      return NextResponse.json({ error: 'Not a member of this server' }, { status: 403 })
    }

    // Generate unique invite code
    const code = randomBytes(6).toString('hex').toUpperCase()

    // Calculate expiration time
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null

    const invite = await prisma.invite.create({
      data: {
        code,
        serverId,
        createdBy: session.user.id,
        expiresAt,
        maxUses: maxUses || null
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true
          }
        },
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        }
      }
    })

    return NextResponse.json(invite)
  } catch (error) {
    console.error('Create invite error:', error)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get('serverId')

    if (!serverId) {
      return NextResponse.json({ error: 'Server ID is required' }, { status: 400 })
    }

    // Check if user is a member of the server
    const serverMember = await prisma.serverMember.findFirst({
      where: {
        userId: session.user.id,
        serverId: serverId,
      },
    })

    if (!serverMember) {
      return NextResponse.json({ error: 'Not a member of this server' }, { status: 403 })
    }

    const invites = await prisma.invite.findMany({
      where: {
        serverId: serverId
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(invites)
  } catch (error) {
    console.error('Get invites error:', error)
    return NextResponse.json({ error: 'Failed to get invites' }, { status: 500 })
  }
} 