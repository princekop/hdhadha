import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string; categoryId: string }> }
) {
  try {
    const { serverId, categoryId } = await params
    const { name, type, isPrivate } = await request.json()

    if (!serverId || !categoryId || !name) {
      return NextResponse.json(
        { error: 'Server ID, category ID, and name are required' },
        { status: 400 }
      )
    }

    // Verify category belongs to server
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        serverId
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Create new channel
    const channel = await prisma.channel.create({
      data: {
        name,
        type: type || 'text',
        categoryId,
        serverId,
        isPrivate: isPrivate || false,
      },
    })

    return NextResponse.json(channel)
  } catch (error) {
    console.error('Create channel error:', error)
    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: 500 }
    )
  }
} 