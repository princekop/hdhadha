import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { channelId } = await params

    const body = await request.json()
    const { backgroundType, backgroundUrl, backgroundColor, isPrivate } = body

    // Get the channel and check permissions
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        server: {
          include: {
            members: {
              where: { userId: (session.user as any).id }
            }
          }
        }
      }
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // Check if user is admin or owner
    const member = channel.server.members[0]
    const isOwner = channel.server.ownerId === (session.user as any).id
    const isAdmin = member?.role === 'admin' || isOwner

    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update channel customization
    const updatedChannel = await prisma.channel.update({
      where: { id: channelId },
      data: {
        backgroundType: backgroundType || null,
        backgroundUrl: backgroundUrl || null,
        backgroundColor: backgroundColor || null,
        isPrivate: isPrivate ?? channel.isPrivate
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedChannel
    })

  } catch (error) {
    console.error('Channel customization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 