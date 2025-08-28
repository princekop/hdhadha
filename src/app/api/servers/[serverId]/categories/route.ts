import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

// This route reads request bodies and uses auth/prisma; ensure it's fully dynamic
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      )
    }

    // Get server categories with channels
    const categories = await prisma.category.findMany({
      where: { serverId },
      include: {
        channels: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Get server categories error:', error)
    return NextResponse.json(
      { error: 'Failed to get server categories' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params
    const { name, emoji } = await request.json()

    if (!serverId || !name) {
      return NextResponse.json(
        { error: 'Server ID and name are required' },
        { status: 400 }
      )
    }

    // Create new category
    const category = await prisma.category.create({
      data: {
        name,
        emoji: emoji || null,
        serverId,
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
} 