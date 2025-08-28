import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meId = (session.user as any).id as string
  const user = await prisma.user.findUnique({ where: { id: meId } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    banner: (user as any).banner ?? null,
    status: user.status,
    description: user.description,
    nitroLevel: (user as any).nitroLevel ?? 0,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meId = (session.user as any).id as string
  const body = await req.json().catch(() => ({}))
  const { displayName, description, status, avatar, banner } = body || {}

  const updated = await prisma.user.update({
    where: { id: meId },
    data: {
      ...(typeof displayName === 'string' ? { displayName } : {}),
      ...(typeof description === 'string' || description === null ? { description } : {}),
      ...(typeof status === 'string' ? { status } : {}),
      ...(typeof avatar === 'string' || avatar === null ? { avatar } : {}),
      ...(typeof banner === 'string' || banner === null ? { banner } as any : {}),
    },
  })

  return NextResponse.json({
    id: updated.id,
    email: updated.email,
    username: updated.username,
    displayName: updated.displayName,
    avatar: updated.avatar,
    banner: (updated as any).banner ?? null,
    status: updated.status,
    description: updated.description,
    nitroLevel: (updated as any).nitroLevel ?? 0,
    isAdmin: updated.isAdmin,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  })
}
