import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      )
    }

    // Get server members
    const members = await prisma.serverMember.findMany({
      where: {
        serverId: serverId,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatar: true,
            avatarDecoration: true,
            status: true,
            badgeServerId: true,
          },
        },
        // Include many-to-many roles assigned to this member
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // Owner first, then admin, then member
        { joinedAt: 'asc' }
      ],
    })

    return NextResponse.json(members.map((member: any) => ({
      id: member.user.id,
      name: member.user.displayName,
      username: member.user.username,
      avatar: member.user.avatar,
      avatarDecoration: member.user.avatarDecoration ?? null,
      status: member.user.status,
      role: member.role,
      roleId: member.roleId ?? null,
      joinedAt: member.joinedAt,
      mutedUntil: member.mutedUntil ?? null,
      timeoutUntil: member.timeoutUntil ?? null,
      // True when this server is the user's chosen badge server
      isBadgeServer: member.user.badgeServerId === serverId,
      // Flatten roles with display fields
      roles: (member.roles || []).map((mr: any) => ({
        id: mr.role.id,
        name: mr.role.name,
        color: mr.role.color,
        gradient: (mr.role as any).gradient ?? null,
        animated: (mr.role as any).animated ?? false,
      })),
    })))
  } catch (error) {
    console.error('Get server members error:', error)
    return NextResponse.json(
      { error: 'Failed to get server members' },
      { status: 500 }
    )
  }
}
 