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
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const server = await prisma.server.findUnique({ where: { id: serverId }, include: { members: true } })
    if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    if (!isOwnerOrAdmin(server, (session.user as any).id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { items } = await request.json() as { items: { id: string; position: number }[] }
    if (!Array.isArray(items)) return NextResponse.json({ error: 'items[] required' }, { status: 400 })

    await prisma.$transaction(items.map((it) =>
      prisma.category.update({ where: { id: it.id }, data: { position: it.position } as any })
    ))

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Reorder categories error:', error)
    return NextResponse.json({ error: 'Failed to reorder categories' }, { status: 500 })
  }
}
