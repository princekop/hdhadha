import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simple admin guard using an admin key header
function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get('x-admin-key') || ''
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { serverId } = await params
    if (!serverId) {
      return NextResponse.json({ error: 'serverId required' }, { status: 400 })
    }

    // Ensure server exists
    const server = await prisma.server.findUnique({ where: { id: serverId } })
    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Set this server as default and unset others
    await prisma.$transaction([
      prisma.server.updateMany({ data: { isDefault: false }, where: { isDefault: true } }),
      prisma.server.update({ where: { id: serverId }, data: { isDefault: true } }),
    ])

    // Backfill memberships: add all users not already in this server
    // Determine the server's default role, if any
    const defaultRole = await prisma.serverRole.findFirst({
      where: { serverId, isDefault: true },
      select: { id: true },
    })
    const existingMembers = await prisma.serverMember.findMany({
      where: { serverId },
      select: { userId: true },
    })
    const existingIds = new Set(existingMembers.map(m => m.userId))

    const users = await prisma.user.findMany({ select: { id: true } })
    const base = users.filter(u => !existingIds.has(u.id))
    const toAdd = base.map(u => ({
      userId: u.id,
      serverId,
      role: 'member' as const,
      ...(defaultRole ? { roleId: defaultRole.id } : {}),
    }))

    if (toAdd.length > 0) {
      await prisma.serverMember.createMany({ data: toAdd, skipDuplicates: true })
    }

    return NextResponse.json({ success: true, added: toAdd.length })
  } catch (err) {
    console.error('Set default server error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
