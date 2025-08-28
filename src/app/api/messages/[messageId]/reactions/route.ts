import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params
    const { emoji, action = 'toggle' } = await request.json()

    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'messageId and emoji are required' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load message with channel and server to verify membership and read access
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: { select: { id: true, serverId: true } } }
    })
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const member = await prisma.serverMember.findFirst({
      where: { serverId: message.channel.serverId, userId: session.user.id },
    })
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check channel read/react permissions
    const perms = await prisma.channelPermission.findMany({
      where: {
        channelId: message.channel.id,
        OR: [
          { userId: session.user.id },
          { userId: null, roleId: null },
        ],
      },
    }) as any[]
    const userPerm = perms.find(p => p.userId === session.user.id)
    const everyonePerm = perms.find(p => p.userId === null)
    const canRead = (userPerm?.canRead ?? everyonePerm?.canRead) ?? true
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const canReact = (userPerm?.canReact ?? everyonePerm?.canReact) ?? true
    if (!canReact) {
      return NextResponse.json({ error: 'Reactions are disabled for you in this channel' }, { status: 403 })
    }

    // Ensure the reaction record exists
    let reaction = await prisma.messageReaction.findFirst({
      where: { messageId, emoji },
    })

    if (!reaction && (action === 'add' || action === 'toggle')) {
      reaction = await prisma.messageReaction.create({
        data: { messageId, emoji },
      })
    }

    if (!reaction) {
      return NextResponse.json({ error: 'Reaction not found' }, { status: 404 })
    }

    const existing = await prisma.messageReactionUser.findUnique({
      where: { reactionId_userId: { reactionId: reaction.id, userId: session.user.id } },
    })

    if (action === 'add') {
      if (!existing) {
        await prisma.messageReactionUser.create({ data: { reactionId: reaction.id, userId: session.user.id } })
      }
    } else if (action === 'remove') {
      if (existing) {
        await prisma.messageReactionUser.delete({ where: { id: existing.id } })
      }
    } else { // toggle
      if (existing) {
        await prisma.messageReactionUser.delete({ where: { id: existing.id } })
      } else {
        await prisma.messageReactionUser.create({ data: { reactionId: reaction.id, userId: session.user.id } })
      }
    }

    // Return updated reactions for the message
    const updated = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        reactions: { include: { users: { select: { userId: true } } } },
      },
    })

    return NextResponse.json({
      messageId,
      reactions: (updated?.reactions || []).map(r => ({ emoji: r.emoji, users: r.users.map(u => u.userId) }))
    })
  } catch (error) {
    console.error('Toggle reaction error:', error)
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 })
  }
}
