import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isOwnerOrAdmin(server: any, userId: string) {
  const isOwner = server.ownerId === userId
  const isAdmin = !!server.members.find((m: any) => m.userId === userId && m.role === 'admin')
  return isOwner || isAdmin
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string; roleId: string }> }
) {
  try {
    const { serverId, roleId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const server = await prisma.server.findUnique({ where: { id: serverId }, include: { members: true } })
    if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    if (!isOwnerOrAdmin(server, (session.user as any).id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const data: any = {}
    if (typeof body.name === 'string') data.name = body.name
    if (typeof body.color === 'string') data.color = body.color
    if ('gradient' in body) data.gradient = (body.gradient ?? null) as any
    if ('animated' in body) data.animated = !!body.animated
    if (Array.isArray(body.permissions)) data.permissions = JSON.stringify(body.permissions)
    if (body.isDefault === true) {
      try { await prisma.serverRole.updateMany({ where: { serverId }, data: { isDefault: false as any } }) } catch {}
      data.isDefault = true as any
    } else if (body.isDefault === false) {
      data.isDefault = false as any
    }

    const updated = await prisma.serverRole.update({ where: { id: roleId }, data })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      color: updated.color,
      gradient: (updated as any).gradient ?? null,
      animated: (updated as any).animated ?? false,
      isDefault: (updated as any).isDefault ?? false,
      permissions: JSON.parse(updated.permissions || '[]'),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    })
  } catch (error) {
    console.error('Update role error:', error)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string; roleId: string }> }
) {
  try {
    const { serverId, roleId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const server = await prisma.server.findUnique({ where: { id: serverId }, include: { members: true } })
    if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    if (!isOwnerOrAdmin(server, (session.user as any).id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Remove role assignments first (M2M)
    await prisma.serverMemberRole.deleteMany({ where: { roleId } })

    await prisma.serverRole.delete({ where: { id: roleId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete role error:', error)
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
  }
}
