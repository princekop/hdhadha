import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { userId } = await params
  const body = await req.json().catch(() => ({}))
  const { nitroLevel } = body as { nitroLevel?: number }
  if (typeof nitroLevel !== 'number' || nitroLevel < 0) {
    return NextResponse.json({ error: 'Invalid nitroLevel' }, { status: 400 })
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    // Cast as any to avoid TS error until prisma migrate + generate updates the client types
    data: { nitroLevel } as any,
  })
  return NextResponse.json({ id: updated.id, nitroLevel: (updated as any).nitroLevel ?? 0 })
}
