import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

// GET tries to compute a "category default" by inspecting the first channel's @everyone row
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params
    const category = await prisma.category.findUnique({ where: { id: categoryId }, include: { channels: true } })
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    const firstChannel = category.channels[0]
    if (!firstChannel) return NextResponse.json({ entries: [] })

    const perms = await prisma.channelPermission.findMany({ where: { channelId: firstChannel.id } })
    const result = perms.map((p: any) => ({
      roleId: p.roleId,
      userId: p.userId,
      canRead: p.canRead ?? null,
      canSend: p.canSend ?? null,
      canSendGifs: p.canSendGifs ?? null,
      canReact: p.canReact ?? null,
    }))
    return NextResponse.json({ entries: result })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load category permissions' }, { status: 500 })
  }
}

// PUT applies given entries to all channels within the category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { categoryId } = await params
    const body = await request.json()
    const { entries } = body as { entries: Array<{ roleId: string | null, userId?: string | null, canRead?: boolean | null, canSend?: boolean | null, canSendGifs?: boolean | null, canReact?: boolean | null }> }
    if (!Array.isArray(entries)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const category = await prisma.category.findUnique({ where: { id: categoryId }, include: { server: true, channels: true } })
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    const member = await prisma.serverMember.findFirst({ where: { serverId: category.serverId, userId: session.user.id } })
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    for (const ch of category.channels) {
      for (const e of entries) {
        const roleId = e.roleId ?? null
        const userId = e.userId ?? null
        const existing = await prisma.channelPermission.findFirst({ where: { channelId: ch.id, roleId, userId } })
        if (existing) {
          await prisma.channelPermission.update({
            where: { id: existing.id },
            data: {
              // @ts-ignore
              canRead: e.canRead as any,
              // @ts-ignore
              canSend: e.canSend as any,
              // @ts-ignore
              canSendGifs: e.canSendGifs as any,
              // @ts-ignore
              canReact: (e as any).canReact as any,
            },
          })
        } else {
          await prisma.channelPermission.create({
            data: {
              channelId: ch.id,
              roleId,
              userId,
              // @ts-ignore
              canRead: e.canRead as any,
              // @ts-ignore
              canSend: e.canSend as any,
              // @ts-ignore
              canSendGifs: e.canSendGifs as any,
              // @ts-ignore
              canReact: (e as any).canReact as any,
            },
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update category permissions' }, { status: 500 })
  }
}
