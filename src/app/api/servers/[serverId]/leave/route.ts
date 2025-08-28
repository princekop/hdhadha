import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { serverId } = await params

    // Get the user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the server and check if user is a member
    const server = await prisma.server.findUnique({
      where: { id: serverId }
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Check if user is the owner
    if (server.ownerId === user.id) {
      return NextResponse.json({ error: 'Server owner cannot leave the server. Transfer ownership or delete the server instead.' }, { status: 400 })
    }

    // Check if user is a member (no composite unique on userId+serverId; use findFirst)
    const member = await prisma.serverMember.findFirst({
      where: {
        userId: user.id,
        serverId: serverId
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'You are not a member of this server' }, { status: 400 })
    }

    // Remove user from server
    await prisma.serverMember.deleteMany({
      where: {
        userId: user.id,
        serverId: serverId
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Successfully left the server' 
    })

  } catch (error) {
    console.error('Leave server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 