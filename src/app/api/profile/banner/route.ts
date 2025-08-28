import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('banner') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to base64 for storage (in a real app, you'd upload to a CDN)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // Update user's banner in database
    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: { banner: dataUrl }
    })

    return NextResponse.json({ bannerUrl: dataUrl })
  } catch (error) {
    console.error('Banner upload error:', error)
    return NextResponse.json({ error: 'Failed to upload banner' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Remove banner from database
    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: { banner: null }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Banner removal error:', error)
    return NextResponse.json({ error: 'Failed to remove banner' }, { status: 500 })
  }
} 