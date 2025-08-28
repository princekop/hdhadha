import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(users.map((u: any) => ({
    id: u.id,
    email: u.email,
    username: u.username,
    displayName: u.displayName,
    avatar: u.avatar,
    isAdmin: u.isAdmin,
    nitroLevel: u.nitroLevel ?? 0,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  })))
}
