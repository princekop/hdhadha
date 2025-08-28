import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('icon') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check if user is owner or admin
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: { members: true }
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    const isOwner = server.ownerId === (session.user as any).id
    const isAdmin = server.members.find(m => m.userId === (session.user as any).id)?.role === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Convert file to base64 for storage (in a real app, you'd upload to a CDN)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // Update server's icon in database
    await prisma.server.update({
      where: { id: serverId },
      data: { icon: dataUrl }
    })

    return NextResponse.json({ iconUrl: dataUrl })
  } catch (error) {
    console.error('Icon upload error:', error)
    return NextResponse.json({ error: 'Failed to upload icon' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner or admin
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: { members: true }
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    const isOwner = server.ownerId === (session.user as any).id
    const isAdmin = server.members.find(m => m.userId === (session.user as any).id)?.role === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Remove icon from database
    await prisma.server.update({
      where: { id: serverId },
      data: { icon: null }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Icon removal error:', error)
    return NextResponse.json({ error: 'Failed to remove icon' }, { status: 500 })
  }
} 