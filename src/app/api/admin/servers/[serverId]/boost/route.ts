import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { serverId } = await params
  const body = await req.json().catch(() => ({}))
  const { byteeLevel } = body as { byteeLevel?: number }
  if (typeof byteeLevel !== 'number' || byteeLevel < 0) {
    return NextResponse.json({ error: 'Invalid byteeLevel' }, { status: 400 })
  }
  const updated = await prisma.server.update({
    where: { id: serverId },
    data: { byteeLevel: byteeLevel as any },
  })
  return NextResponse.json({ id: updated.id, byteeLevel: (updated as any).byteeLevel ?? 0 })
}
