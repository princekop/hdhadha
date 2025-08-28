import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { serverId } = await params
  if (!serverId) return NextResponse.json({ error: 'serverId required' }, { status: 400 })
  try {
    await prisma.server.delete({ where: { id: serverId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Admin delete server error:', e)
    return NextResponse.json({ error: 'Failed to delete server' }, { status: 500 })
  }
}
