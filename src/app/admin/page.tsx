import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AdminClient from './AdminClient'
import { Suspense } from 'react'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = !!(session?.user as any)?.isAdmin
  if (!session?.user || !isAdmin) {
    redirect('/dash')
  }

  const [users, servers] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.server.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { members: true } },
        owner: { select: { id: true, username: true, displayName: true } },
      },
    }),
  ])

  const safeUsers = users.map((u: any) => ({
    id: u.id,
    email: u.email,
    username: u.username,
    displayName: u.displayName,
    avatar: u.avatar,
    isAdmin: u.isAdmin,
    nitroLevel: u.nitroLevel ?? 0,
    createdAt: u.createdAt?.toISOString?.() ?? u.createdAt,
  }))

  const safeServers = servers.map((s: any) => ({
    id: s.id,
    name: s.name,
    tag: s.tag ?? null,
    byteeLevel: s.byteeLevel ?? 0,
    members: s._count?.members ?? 0,
    owner: s.owner,
    createdAt: s.createdAt?.toISOString?.() ?? s.createdAt,
  }))

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <AdminClient users={safeUsers} servers={safeServers} />
    </Suspense>
  )
}
