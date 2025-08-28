import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params
    const body = await request.json()
    const { displayName, status, description, avatar, banner, avatarDecoration } = body

    // Only allow users to update their own profile
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: ({
        displayName: displayName || undefined,
        status: status || undefined,
        avatar: avatar || undefined,
        banner: banner || undefined,
        description: description || undefined,
        avatarDecoration: avatarDecoration === undefined ? undefined : avatarDecoration,
      } as any),
      select: ({
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        avatarDecoration: true,
        banner: true,
        status: true,
        description: true,
        isAdmin: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      } as any)
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: ({
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        avatarDecoration: true,
        banner: true,
        status: true,
        description: true,
        isAdmin: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      } as any)
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}