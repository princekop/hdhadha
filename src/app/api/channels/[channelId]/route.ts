import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const channel = await prisma.channel.findUnique({ where: { id: channelId } })
    if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(channel)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load channel' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { channelId } = await params
    const body = await request.json()
    const { name, type, categoryId } = body || {}

    const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } })
    if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const member = await prisma.serverMember.findFirst({ where: { serverId: channel.serverId, userId: session.user.id } })
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {}
    if (typeof name === 'string') updateData.name = name
    if (typeof type === 'string') updateData.type = type
    if (typeof categoryId === 'string') updateData.categoryId = categoryId
    const updated = await prisma.channel.update({
      where: { id: channelId },
      data: updateData,
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { channelId } = await params
    const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } })
    if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const member = await prisma.serverMember.findFirst({ where: { serverId: channel.serverId, userId: (session.user as any).id } })
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.channel.delete({ where: { id: channelId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 })
  }
}
