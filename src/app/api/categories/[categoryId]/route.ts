import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params
    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(category)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load category' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { categoryId } = await params
    const body = await request.json()
    const { name, emoji } = body || {}

    const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { serverId: true } })
    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const member = await prisma.serverMember.findFirst({ where: { serverId: cat.serverId, userId: session.user.id } })
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: { name, emoji },
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { categoryId } = await params

    // Get category and its serverId
    const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { serverId: true } })
    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Only owner/admin may delete a category
    const member = await prisma.serverMember.findFirst({ where: { serverId: cat.serverId, userId: (session.user as any).id } })
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Deleting a category will cascade delete its channels (see Prisma schema)
    await prisma.category.delete({ where: { id: categoryId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
