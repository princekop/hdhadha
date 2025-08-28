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

    // Get server roles with member count
    const roles = await prisma.serverRole.findMany({
      where: { serverId },
      include: { members: true },
      orderBy: { createdAt: 'asc' },
    })

    const payload = roles.map((r: any) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      // @ts-ignore
      gradient: (r as any).gradient,
      // @ts-ignore
      image: (r as any).image,
      // @ts-ignore
      isDefault: (r as any).isDefault,
      permissions: JSON.parse(r.permissions || '[]'),
      memberCount: r.members.length,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Get server roles error:', error)
    return NextResponse.json(
      { error: 'Failed to get server roles' },
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
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, color, permissions, gradient, image, isDefault } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 })
    }

    // Check if user is owner or admin
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: { members: true }
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    const isOwner = server.ownerId === (session.user as any).id
    const isAdmin = server.members.find(m => m.userId === (session.user as any).id)?.role === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let newRole: any
    try {
      // Try full-feature path (schemas with gradient/image/isDefault)
      if (isDefault === true) {
        // Unset all defaults first (if field exists in schema)
        try {
          // @ts-ignore
          await prisma.serverRole.updateMany({ where: { serverId }, data: { isDefault: false as any } })
        } catch (e) {
          // Field not in schema yet; ignore
        }
      }

      newRole = await prisma.serverRole.create({
        data: {
          name,
          color: color || '#99AAB5',
          // @ts-ignore - if field exists
          gradient: (gradient || null) as any,
          // @ts-ignore - if field exists
          image: (image || null) as any,
          // @ts-ignore - if field exists
          isDefault: (!!isDefault) as any,
          permissions: JSON.stringify(permissions || []),
          serverId,
        },
      })
    } catch (e: any) {
      // Fallback: create without the new fields if Prisma rejects them
      newRole = await prisma.serverRole.create({
        data: {
          name,
          color: color || '#99AAB5',
          permissions: JSON.stringify(permissions || []),
          serverId,
        },
      })
    }

    return NextResponse.json({
      id: newRole.id,
      name: newRole.name,
      color: newRole.color,
      // Optional fields (null if not in schema)
      gradient: (newRole as any).gradient ?? null,
      image: (newRole as any).image ?? null,
      isDefault: (newRole as any).isDefault ?? false,
      permissions: JSON.parse(newRole.permissions || '[]'),
      memberCount: 0,
      createdAt: newRole.createdAt,
      updatedAt: newRole.updatedAt,
    })
  } catch (error) {
    console.error('Create role error:', error)
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    )
  }
}