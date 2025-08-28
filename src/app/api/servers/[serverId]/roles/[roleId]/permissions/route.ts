import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string, roleId: string }> }
) {
  try {
    const { serverId, roleId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // must be owner or admin
    const member = await prisma.serverMember.findFirst({ where: { serverId, userId: session.user.id } })
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const role = await prisma.serverRole.findFirst({ where: { id: roleId, serverId } })
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

    let perms: string[] = []
    try {
      perms = role.permissions ? JSON.parse(role.permissions) : []
      if (!Array.isArray(perms)) perms = []
    } catch {
      perms = []
    }
    return NextResponse.json({ permissions: perms })
  } catch (error) {
    console.error('Get role permissions error:', error)
    return NextResponse.json({ error: 'Failed to get role permissions' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string, roleId: string }> }
) {
  try {
    const { serverId, roleId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { permissions } = body as { permissions: string[] }
    if (!Array.isArray(permissions)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    // must be owner or admin
    const member = await prisma.serverMember.findFirst({ where: { serverId, userId: session.user.id } })
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ensure role belongs to server
    const role = await prisma.serverRole.findFirst({ where: { id: roleId, serverId } })
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

    // Save permissions as JSON string
    await prisma.serverRole.update({
      where: { id: roleId },
      data: { permissions: JSON.stringify(permissions) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update role permissions error:', error)
    return NextResponse.json({ error: 'Failed to update role permissions' }, { status: 500 })
  }
}
