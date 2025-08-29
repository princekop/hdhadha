import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { channelId } = await params

    const body = await request.json()
    const { backgroundType, backgroundUrl, backgroundColor, isPrivate, nameColor, nameGradient, nameAnimation, font } = body

    // Get the channel and check permissions
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        server: {
          include: {
            members: {
              where: { userId: (session.user as any).id }
            }
          }
        }
      }
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // Check if user is admin or owner
    const member = channel.server.members[0]
    const isOwner = channel.server.ownerId === (session.user as any).id
    const isAdmin = member?.role === 'admin' || isOwner

    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Enforce owner-only for pattern backgrounds
    if (backgroundType === 'pattern' && !isOwner) {
      return NextResponse.json({ error: 'Only the server owner can apply pattern backgrounds' }, { status: 403 })
    }

    // Validate allowed pattern keys to prevent arbitrary CSS injection via backgroundUrl
    const allowedPatterns = new Set([
      'checker-gradient',
      'dark-stripes-cube',
      'radial-dots',
      'isometric-conic',
      'gridlines',
      'noisy-mask',
    ])
    let safeBackgroundUrl: string | null = backgroundUrl || null
    if (backgroundType === 'pattern') {
      if (!safeBackgroundUrl || !allowedPatterns.has(safeBackgroundUrl)) {
        return NextResponse.json({ error: 'Invalid pattern preset' }, { status: 400 })
      }
    }

    // Validate channel name styling
    const allowedAnimations = new Set(['rgb', 'rainbow', 'none', null])
    const allowedGradients = new Set([
      'linear-gradient(90deg,#f00,#0f0,#00f)',
      'linear-gradient(90deg, red, orange, yellow, green, cyan, blue, violet)',
      'linear-gradient(90deg,#8a2be2,#00ffff)',
    ])
    const allowedFonts = new Set([
      // Note: ensure these fonts are loaded in the frontend for accurate rendering
      'Inter', 'Poppins', 'Montserrat', 'Raleway', 'Oswald', 'Roboto Slab', 'Merriweather', 'Playfair Display', 'Lobster', 'Bebas Neue',
      'Press Start 2P', 'Orbitron', 'Audiowide', 'Bangers', 'Black Ops One', 'Teko', 'Anton', 'Cinzel', 'Caveat', 'Permanent Marker',
      'Rubik', 'Kanit', 'Fjalla One', 'Russo One', 'Saira Stencil One', 'Secular One', 'Tourney', 'Varela Round', 'Nunito', 'Asap'
    ])
    let safeNameColor: string | null = null
    let safeNameGradient: string | null = null
    let safeNameAnimation: string | null = null
    let safeFont: string | null = null

    if (typeof nameColor === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(nameColor)) {
      safeNameColor = nameColor
    }
    if (typeof nameGradient === 'string' && allowedGradients.has(nameGradient)) {
      safeNameGradient = nameGradient
    }
    if (nameAnimation === undefined || nameAnimation === null) {
      safeNameAnimation = null
    } else if (typeof nameAnimation === 'string' && allowedAnimations.has(nameAnimation)) {
      safeNameAnimation = nameAnimation === 'none' ? null : nameAnimation
    }
    if (font === undefined || font === null || font === '' || font === 'default') {
      safeFont = null
    } else if (typeof font === 'string' && allowedFonts.has(font)) {
      safeFont = font
    }

    // Update channel customization (with graceful fallback if Prisma Client is stale)
    const baseData: any = {
      backgroundType: backgroundType || null,
      backgroundUrl: safeBackgroundUrl,
      backgroundColor: backgroundColor || null,
      isPrivate: isPrivate ?? channel.isPrivate,
    }
    const styledData: any = {
      ...baseData,
      nameColor: safeNameColor,
      nameGradient: safeNameGradient,
      nameAnimation: safeNameAnimation,
      font: safeFont,
    }

    try {
      const updatedChannel = await prisma.channel.update({
        where: { id: channelId },
        data: styledData as any,
      })
      return NextResponse.json({ success: true, data: updatedChannel })
    } catch (e: any) {
      // Likely Prisma Client not regenerated; retry without name* fields
      console.error('Primary update failed, retrying without name styling fields:', e?.message || e)
      const updatedChannel = await prisma.channel.update({
        where: { id: channelId },
        data: baseData,
      })
      return NextResponse.json({
        success: true,
        data: updatedChannel,
        warning: 'Prisma client may be stale. Name styling not applied until prisma generate runs.',
      })
    }

  } catch (error) {
    console.error('Channel customization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 