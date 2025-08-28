import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isOwnerOrAdmin(server: any, userId: string) {
  const isOwner = server.ownerId === userId
  const isAdmin = !!server.members.find((m: any) => m.userId === userId && m.role === 'admin')
  return isOwner || isAdmin
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string; userId: string }> }
) {
  try {
    const { serverId, userId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { roleId } = await request.json()
    if (!serverId || !userId || !roleId) {
      return NextResponse.json({ error: 'serverId, userId and roleId are required' }, { status: 400 })
    }

    const server = await prisma.server.findUnique({ where: { id: serverId }, include: { members: true } })
    if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    if (!isOwnerOrAdmin(server, (session.user as any).id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const member = await prisma.serverMember.findFirst({ where: { serverId, userId } })
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    // Create relation if not exists
    await prisma.serverMemberRole.upsert({
      where: { memberId_roleId: { memberId: member.id, roleId } },
      update: {},
      create: { memberId: member.id, roleId },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Assign role error:', error)
    return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string; userId: string }> }
) {
  try {
    const { serverId, userId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { roleId } = await request.json()
    if (!serverId || !userId || !roleId) {
      return NextResponse.json({ error: 'serverId, userId and roleId are required' }, { status: 400 })
    }

    const server = await prisma.server.findUnique({ where: { id: serverId }, include: { members: true } })
    if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    if (!isOwnerOrAdmin(server, (session.user as any).id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const member = await prisma.serverMember.findFirst({ where: { serverId, userId } })
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    await prisma.serverMemberRole.deleteMany({ where: { memberId: member.id, roleId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Unassign role error:', error)
    return NextResponse.json({ error: 'Failed to unassign role' }, { status: 500 })
  }
}
