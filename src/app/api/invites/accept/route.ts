import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
    }

    const invite = await prisma.invite.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        server: { select: { id: true, name: true, description: true, icon: true } },
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
    }

    // Check expiry
    if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
    }

    // Check uses limit
    if (invite.maxUses !== null && typeof invite.maxUses === 'number') {
      if (invite.uses >= invite.maxUses) {
        return NextResponse.json({ error: 'Invite has reached max uses' }, { status: 410 })
      }
    }

    // If already a member, just return success with server id
    const existingMember = await prisma.serverMember.findFirst({
      where: { userId: session.user.id, serverId: invite.serverId },
    })

    if (!existingMember) {
      // Add membership
      const createdMember = await prisma.serverMember.create({
        data: { userId: session.user.id, serverId: invite.serverId, role: 'member' },
      })

      // Best-effort: assign default role if configured
      try {
        // @ts-ignore - serverRole/serverMemberRole fields exist after migration
        const defaultRole = await (prisma as any).serverRole.findFirst({
          where: { serverId: invite.serverId, isDefault: true },
          select: { id: true },
        })
        if (defaultRole) {
          // @ts-ignore - serverMemberRole exists after migration
          await (prisma as any).serverMemberRole.create({
            data: {
              serverId: invite.serverId,
              userId: session.user.id,
              roleId: defaultRole.id,
            },
          })
        }
      } catch (e) {
        // ignore if migration not yet applied
        console.warn('Default role assignment skipped (migration not applied yet).')
      }
    }

    // Increment uses
    await prisma.invite.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } },
    })

    return NextResponse.json({ success: true, serverId: invite.serverId, server: invite.server })
  } catch (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}
