import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (!(session.user as any)?.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    // Get message views with user details
    const messageViews = await prisma.messageView.findMany({
      where: {
        messageId: messageId,
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
      orderBy: {
        viewedAt: 'asc',
      },
    })

    return NextResponse.json({
      messageId,
      totalViews: messageViews.length,
      views: messageViews.map(view => ({
        userId: view.userId,
        username: view.user.username,
        displayName: view.user.displayName,
        avatar: view.user.avatar,
        viewedAt: view.viewedAt,
      })),
    })
  } catch (error) {
    console.error('Get read receipts error:', error)
    return NextResponse.json(
      { error: 'Failed to get read receipts' },
      { status: 500 }
    )
  }
} 