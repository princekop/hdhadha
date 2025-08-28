import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

// Assign or remove a role for a server member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string; userId: string }> }
) {
  try {
    const { serverId, userId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!serverId || !userId) {
      return NextResponse.json({ error: 'Missing serverId or userId' }, { status: 400 })
    }

    const { roleId } = await request.json().catch(() => ({ roleId: undefined })) as { roleId?: string | null }

    if (typeof roleId === 'undefined') {
      return NextResponse.json({ error: 'roleId is required (use null to remove)' }, { status: 400 })
    }

    // Load server with members to verify permissions
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: { members: true }
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    const requesterId = (session.user as any).id as string
    const requesterMembership = server.members.find(m => m.userId === requesterId)

    const isOwner = server.ownerId === requesterId
    const isAdmin = requesterMembership?.role === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Target member must exist in this server
    const targetMember = server.members.find(m => m.userId === userId)
    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent admins from altering owner membership
    if (!isOwner && targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot modify owner' }, { status: 403 })
    }

    // If setting a role, validate it belongs to the server
    if (roleId) {
      const role = await prisma.serverRole.findFirst({ where: { id: roleId, serverId } })
      if (!role) {
        return NextResponse.json({ error: 'Role not found in this server' }, { status: 404 })
      }
    }

    // Perform update
    const updated = await prisma.serverMember.update({
      where: { id: targetMember.id },
      data: { roleId: roleId ?? null },
      include: { user: { select: { id: true, displayName: true, username: true, avatar: true, status: true } } }
    })

    return NextResponse.json({
      id: updated.user.id,
      name: updated.user.displayName,
      username: updated.user.username,
      avatar: updated.user.avatar,
      status: updated.user.status,
      roleId: updated.roleId ?? null,
      joinedAt: updated.joinedAt,
    })
  } catch (error) {
    console.error('Update member role error:', error)
    return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 })
  }
}
