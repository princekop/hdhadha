import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 })
    }

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, serverId: true },
    })
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const member = await prisma.serverMember.findFirst({
      where: { serverId: channel.serverId, userId: session.user.id },
    })
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const roleIds = member.roleId ? [member.roleId] : []
    const permRows = await prisma.channelPermission.findMany({
      where: {
        channelId: channel.id,
        OR: [
          { userId: session.user.id },
          { roleId: { in: roleIds } },
          { userId: null, roleId: null },
        ],
      },
      select: { permission: true, userId: true, roleId: true },
    })

    const resolve = (key: 'canRead' | 'canSend' | 'canSendGifs' | 'canReact'): boolean => {
      const hasUserDeny = permRows.some(r => r.userId === session.user.id && r.permission === `deny:${key}`)
      if (hasUserDeny) return false
      const hasUserAllow = permRows.some(r => r.userId === session.user.id && r.permission === `allow:${key}`)
      if (hasUserAllow) return true
      const hasRoleDeny = permRows.some(r => r.roleId && roleIds.includes(r.roleId) && r.permission === `deny:${key}`)
      if (hasRoleDeny) return false
      const hasRoleAllow = permRows.some(r => r.roleId && roleIds.includes(r.roleId) && r.permission === `allow:${key}`)
      if (hasRoleAllow) return true
      const hasEveryoneDeny = permRows.some(r => r.userId === null && r.roleId === null && r.permission === `deny:${key}`)
      if (hasEveryoneDeny) return false
      const hasEveryoneAllow = permRows.some(r => r.userId === null && r.roleId === null && r.permission === `allow:${key}`)
      if (hasEveryoneAllow) return true
      return false
    }

    const canRead = resolve('canRead')
    const canSend = resolve('canSend')
    const canSendGifs = resolve('canSendGifs')
    const canReact = resolve('canReact')

    return NextResponse.json({ canRead, canSend, canSendGifs, canReact })
  } catch (e) {
    console.error('GET me/permissions error', e)
    return NextResponse.json({ error: 'Failed to compute permissions' }, { status: 500 })
  }
}
