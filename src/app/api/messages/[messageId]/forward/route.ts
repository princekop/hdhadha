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
    const { targetChannelId, userId } = await request.json()

    if (!messageId || !targetChannelId || !userId) {
      return NextResponse.json(
        { error: 'Message ID, target channel ID, and user ID are required' },
        { status: 400 }
      )
    }

    // Get the original message
    const originalMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatar: true,
          },
        },
      },
    })

    if (!originalMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Create forwarded message
    const forwardedMessage = await prisma.message.create({
      data: {
        content: `**Forwarded from ${originalMessage.user.username}:**\n${originalMessage.content}`,
        userId,
        channelId: targetChannelId,
        mentions: originalMessage.mentions,
        attachments: originalMessage.attachments,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatar: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: forwardedMessage.id,
      content: forwardedMessage.content,
      userId: forwardedMessage.userId,
      channelId: forwardedMessage.channelId,
      timestamp: forwardedMessage.createdAt,
      mentions: JSON.parse(forwardedMessage.mentions || '[]'),
      attachments: JSON.parse(forwardedMessage.attachments || '[]'),
      viewedBy: [],
      reactions: [],
    })
  } catch (error) {
    console.error('Forward message error:', error)
    return NextResponse.json(
      { error: 'Failed to forward message' },
      { status: 500 }
    )
  }
} 