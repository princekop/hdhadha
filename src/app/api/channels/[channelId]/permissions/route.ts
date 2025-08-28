import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { id: true, serverId: true } })
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

    // Only server owner/admin can manage permissions
    const member = await prisma.serverMember.findFirst({ where: { serverId: channel.serverId, userId: session.user.id } })
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rows = await prisma.channelPermission.findMany({ where: { channelId } })

    // Aggregate string-based permission rows per principal into tri-state booleans
    type Key = 'canRead' | 'canSend' | 'canSendGifs' | 'canReact'
    const keys: Key[] = ['canRead', 'canSend', 'canSendGifs', 'canReact']
    type Base = { id: string; roleId: string | null; userId: string | null }
    type Agg = Base & { [k in Key]: boolean | null }
    const map = new Map<string, Agg>()
    const pid = (rId: string | null, uId: string | null) => `${rId || 'null'}:${uId || 'null'}`
    const ensure = (rId: string | null, uId: string | null) => {
      const k = pid(rId, uId)
      if (!map.has(k)) {
        map.set(k, { id: k, roleId: rId, userId: uId, canRead: null, canSend: null, canSendGifs: null, canReact: null })
      }
      return map.get(k)!
    }
    for (const r of rows) {
      const [mode, key] = (r.permission || '').split(':') as [string, Key]
      if (!keys.includes(key)) continue
      const agg = ensure(r.roleId ?? null, r.userId ?? null)
      // if both allow and deny exist, deny wins; but here we just set according to row then resolve precedence in consumer
      if (mode === 'allow') agg[key] = true
      else if (mode === 'deny') agg[key] = false
    }

    // Ensure an @everyone row exists
    ensure(null, null)
    return NextResponse.json(Array.from(map.values()))
  } catch (error) {
    console.error('Get channel permissions error:', error)
    return NextResponse.json({ error: 'Failed to get channel permissions' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { entries } = body as { entries: Array<{ roleId: string | null, userId?: string | null, canRead?: boolean | null, canSend?: boolean | null, canSendGifs?: boolean | null, canReact?: boolean | null }> }
    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { id: true, serverId: true } })
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

    // Only server owner/admin can manage permissions
    const member = await prisma.serverMember.findFirst({ where: { serverId: channel.serverId, userId: session.user.id } })
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For each principal and key, ensure rows reflect desired state: true => allow:key, false => deny:key, null => none
    const keys: Array<keyof typeof entries[number]> = ['canRead', 'canSend', 'canSendGifs', 'canReact']
    for (const e of entries) {
      const roleId = e.roleId ?? null
      const userId = e.userId ?? null
      for (const k of keys) {
        const val = e[k] as boolean | null | undefined
        const key = k as 'canRead' | 'canSend' | 'canSendGifs' | 'canReact'
        const allowPerm = `allow:${key}`
        const denyPerm = `deny:${key}`
        if (val === true) {
          // ensure allow exists, delete deny
          const exists = await prisma.channelPermission.findFirst({
            where: { channelId, roleId, userId, permission: allowPerm },
            select: { id: true },
          })
          if (!exists) {
            await prisma.channelPermission.create({ data: { channelId, roleId, userId, permission: allowPerm } })
          }
          await prisma.channelPermission.deleteMany({ where: { channelId, roleId, userId, permission: denyPerm } })
        } else if (val === false) {
          const exists = await prisma.channelPermission.findFirst({
            where: { channelId, roleId, userId, permission: denyPerm },
            select: { id: true },
          })
          if (!exists) {
            await prisma.channelPermission.create({ data: { channelId, roleId, userId, permission: denyPerm } })
          }
          await prisma.channelPermission.deleteMany({ where: { channelId, roleId, userId, permission: allowPerm } })
        } else {
          // null/undefined: remove both
          await prisma.channelPermission.deleteMany({ where: { channelId, roleId, userId, permission: { in: [allowPerm, denyPerm] } } })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update channel permissions error:', error)
    return NextResponse.json({ error: 'Failed to update channel permissions' }, { status: 500 })
  }
}
