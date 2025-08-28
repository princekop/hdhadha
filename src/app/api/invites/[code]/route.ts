import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    const invite = await prisma.invite.findUnique({
      where: { code },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            banner: true
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

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }

    // Check if invite is expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
    }

    // Check if invite has reached max uses
    if (invite.maxUses && invite.uses >= invite.maxUses) {
      return NextResponse.json({ error: 'Invite has reached maximum uses' }, { status: 410 })
    }

    return NextResponse.json(invite)
  } catch (error) {
    console.error('Get invite error:', error)
    return NextResponse.json({ error: 'Failed to get invite' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await params

    const invite = await prisma.invite.findUnique({
      where: { code },
      include: {
        server: true
      }
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }

    // Check if invite is expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
    }

    // Check if invite has reached max uses
    if (invite.maxUses && invite.uses >= invite.maxUses) {
      return NextResponse.json({ error: 'Invite has reached maximum uses' }, { status: 410 })
    }

    // Get the actual user from database to ensure we have the correct ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      console.error('User not found for email:', session.user.email)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify server exists
    const server = await prisma.server.findUnique({
      where: { id: invite.serverId }
    })

    if (!server) {
      console.error('Server not found for ID:', invite.serverId)
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    console.log('Creating server member:', { userId: user.id, serverId: invite.serverId })

    // Check if user is already a member (no composite unique on userId+serverId; use findFirst)
    const existingMember = await prisma.serverMember.findFirst({
      where: {
        userId: user.id,
        serverId: invite.serverId
      }
    })

    if (existingMember) {
      console.log('User already a member, redirecting to server')
      return NextResponse.json({ 
        success: true, 
        serverId: invite.serverId,
        message: 'Already a member of this server',
        redirect: true
      })
    }

    // Add user to server and increment invite uses
    await prisma.$transaction([
      prisma.serverMember.create({
        data: {
          userId: user.id,
          serverId: invite.serverId,
          role: 'member'
        }
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { uses: { increment: 1 } }
      })
    ])

    return NextResponse.json({ 
      success: true, 
      serverId: invite.serverId,
      message: 'Successfully joined server' 
    })
  } catch (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await params

    const invite = await prisma.invite.findUnique({
      where: { code },
      include: {
        server: true
      }
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Check if user is the creator of the invite or server owner
    if (invite.createdBy !== session.user.id && invite.server.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this invite' }, { status: 403 })
    }

    await prisma.invite.delete({
      where: { code }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete invite error:', error)
    return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 })
  }
} 