import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const user = await prisma.user.findUnique({ where: { id: userId } })
  return NextResponse.json({
    id: user?.id,
    displayName: user?.displayName,
    username: user?.username,
    avatar: user?.avatar,
    avatarDecoration: (user as any)?.avatarDecoration ?? null,
  })
}

export async function PATCH(request: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { avatarDecoration } = await request.json()
  if (avatarDecoration !== null && typeof avatarDecoration !== 'string') {
    return NextResponse.json({ error: 'Invalid decoration' }, { status: 400 })
  }

  const userId = (session.user as any).id as string
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { avatarDecoration: avatarDecoration as any },
  })

  return NextResponse.json({ success: true, avatarDecoration: (updated as any).avatarDecoration ?? null })
}
