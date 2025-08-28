import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { serverId } = await params
  if (!serverId) return NextResponse.json({ error: 'serverId required' }, { status: 400 })

  try {
    const body = await req.json().catch(() => ({}))
    const { advertisementEnabled, advertisementText } = body || {}

    const data: any = {}
    if (typeof advertisementEnabled === 'boolean') data.advertisementEnabled = advertisementEnabled
    if (typeof advertisementText === 'string') data.advertisementText = advertisementText
    await prisma.server.update({ where: { id: serverId }, data })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Admin update advertise error:', e)
    return NextResponse.json({ error: 'Failed to update advertisement' }, { status: 500 })
  }
}
