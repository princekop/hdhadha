import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      )
    }

    // Get server with members count
    const server = await prisma.server.findUnique({
      where: {
        id: serverId,
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
        owner: {
          select: {
            id: true,
            displayName: true,
            username: true,
          },
        },
      },
    })

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: server.id,
      name: server.name,
      description: server.description,
      icon: server.icon,
      banner: server.banner,
      ownerId: server.ownerId,
      owner: server.owner,
      members: server._count.members,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      tag: (server as any).tag ?? null,
      byteeLevel: (server as any).byteeLevel ?? 0,
      advertisementEnabled: (server as any).advertisementEnabled ?? false,
      advertisementText: (server as any).advertisementText ?? null,
    })
  } catch (error) {
    console.error('Get server error:', error)
    return NextResponse.json(
      { error: 'Failed to get server' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { serverId } = await params
    const meId = (session.user as any).id as string
    const isGlobalAdmin = !!(session.user as any).isAdmin

    const server = await prisma.server.findUnique({ where: { id: serverId } })
    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Check membership role
    const membership = await prisma.serverMember.findFirst({
      where: { serverId, userId: meId },
      select: { role: true },
    })
    const isOwner = server.ownerId === meId
    const isServerAdmin = membership?.role === 'admin' || membership?.role === 'owner'

    if (!isOwner && !isServerAdmin && !isGlobalAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { name, description, icon, banner, tag, byteeLevel, advertisementEnabled, advertisementText } = body || {}

    const updated = await prisma.server.update({
      where: { id: serverId },
      data: {
        ...(typeof name === 'string' ? { name } : {}),
        ...(typeof description === 'string' || description === null ? { description } : {}),
        ...(typeof icon === 'string' || icon === null ? { icon } : {}),
        ...(typeof banner === 'string' || banner === null ? { banner } : {}),
        ...(typeof tag === 'string' ? { tag } : {}),
        ...(typeof byteeLevel === 'number' ? { byteeLevel } : {}),
        ...((typeof advertisementEnabled === 'boolean') ? { advertisementEnabled } : {}),
        ...((typeof advertisementText === 'string' || advertisementText === null) ? { advertisementText } : {}),
      },
      include: {
        _count: { select: { members: true } },
        owner: { select: { id: true, displayName: true, username: true } },
      },
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      icon: updated.icon,
      banner: updated.banner,
      ownerId: updated.ownerId,
      owner: updated.owner,
      members: updated._count.members,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      tag: (updated as any).tag ?? null,
      byteeLevel: (updated as any).byteeLevel ?? 0,
      advertisementEnabled: (updated as any).advertisementEnabled ?? false,
      advertisementText: (updated as any).advertisementText ?? null,
    })
  } catch (error) {
    console.error('Update server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { serverId } = await params

    // Get the server and check if user is the owner
    const server = await prisma.server.findUnique({
      where: { id: serverId }
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    if (server.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Only the server owner can delete the server' }, { status: 403 })
    }

    // Delete the server (this will cascade delete all related data)
    await prisma.server.delete({
      where: { id: serverId }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Server deleted successfully' 
    })

  } catch (error) {
    console.error('Delete server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 