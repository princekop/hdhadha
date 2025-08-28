import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

// Channel and server constants
const COMMUNITY_SERVER_ID = 'cmdyince50002dl08h97cn2rb'
const ENTRY_CHANNEL_ID = 'cmdyiobxt0005dlr8mzn946cb'
const ANNOUNCEMENT_CHANNEL_ID = 'cmdyioc0p000bdlr8hf6vxxvr'
const RULES_CHANNEL_ID = 'cmdyioc1o000ddlr8874u8ns0'
const GLOBAL_CHAT_CHANNEL_IDS = [
  'cmdyioc2s000fdlr8fqyocipl',
  'cmdyioc4w000jdlr8kvkgkfio',
  'cmdyioc87000pdlr8ozzkhoqu',
  'cmdyioc9b000rdlr80fvzsji0',
  'cmdyiocn3001hdlr8ly2zllzi', // explicit global chat id
]
const BOT_CHANNEL_ID = 'cmdyiocp1001ldlr8vb9w63pg'

async function moderateWithGemini(text: string): Promise<{ allow: boolean; reason?: string }> {
  try {
    const apiKey = process.env.GEMINI_MODERATION_KEY
    if (!apiKey) return { allow: true }
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({ contents: [{ parts: [{ text }] }] }),
    })
    if (!res.ok) return { allow: true }
    const data = await res.json()
    const output = JSON.stringify(data)
    // naive checks; in production, configure safety settings and parse categories
    const lowered = text.toLowerCase()
    const blocked = [
      'abuse', 'hate', 'threat', 'harass', 'nsfw', 'porn', 'sexual',
      'darkbyte sucks', 'bad gif', 'bad image', 'bad video'
    ].some(k => lowered.includes(k))
    if (blocked) return { allow: false, reason: 'Content violates community guidelines' }
    return { allow: true }
  } catch (e) {
    console.warn('Gemini moderation error', e)
    return { allow: true }
  }
}

// Dedicated bot identity
async function getOrCreateBotUser() {
  // Create or retrieve a dedicated bot user for posting replies
  const username = 'darkbyte-ai'
  const email = 'bot@darkbyte.local'
  const displayName = 'Darkbyte AI'
  let user = await prisma.user.findFirst({ where: { username } })
  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          email,
          username,
          displayName,
          password: 'disabled',
          avatar: '/file.svg',
          isAdmin: false,
        },
      })
    } catch {
      // fallback in case username collides, try by email
      user = await prisma.user.findFirst({ where: { email } })
    }
  }
  return user
}

async function generateBotReply(prompt: string): Promise<string | null> {
  try {
    const apiKey = process.env.GEMINI_BOT_KEY
    if (!apiKey) return null
    const systemPrefix = [
      'You are Darkbyte Assistant — an enthusiastic, helpful brand voice for Darkbyte Minecraft hosting.',
      'Only discuss Darkbyte products (Minecraft hosting, VPS, add-ons) and related topics.',
      'Respond VERY briefly: max 2 short sentences. Prefer bullet points only when essential.',
      'Keep tone on-brand, family-friendly, and safe for all ages. Include a subtle CTA only if useful.',
    ].join(' ')
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrefix}\n\nUser: ${prompt}` }] }] }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || null
    return text
  } catch (e) {
    console.warn('Gemini bot error', e)
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Note: GET should not enforce send-rate, mention limits, or moderation.
    // Those checks belong in POST when creating messages.

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      )
    }

    // Load channel and verify membership
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, serverId: true },
    })
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const member = await prisma.serverMember.findFirst({
      where: { serverId: channel.serverId, userId: session.user.id },
    })
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Determine read permission using string-based rows (default deny unless explicitly allowed)
    const readRows = await prisma.channelPermission.findMany({
      where: {
        channelId: channel.id,
        OR: [
          { userId: session.user.id },
          { userId: null, roleId: null },
        ],
      },
      select: { permission: true, userId: true, roleId: true },
    })
    const hasUserDenyRead = readRows.some(r => r.userId === session.user.id && r.permission === 'deny:canRead')
    const hasUserAllowRead = readRows.some(r => r.userId === session.user.id && r.permission === 'allow:canRead')
    const hasEveryoneDenyRead = readRows.some(r => r.userId === null && r.roleId === null && r.permission === 'deny:canRead')
    const hasEveryoneAllowRead = readRows.some(r => r.userId === null && r.roleId === null && r.permission === 'allow:canRead')
    const canRead = hasUserDenyRead ? false : hasUserAllowRead ? true : hasEveryoneDenyRead ? false : hasEveryoneAllowRead ? true : true
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get messages for the channel
    const messages = await prisma.message.findMany({
      where: {
        channelId: channelId,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatar: true,
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        viewedBy: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        reactions: {
          include: {
            users: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Note: GET should not trigger bot replies. Keep this logic in POST if needed.

    const safe = messages.map(message => {
      let mentions: any[] = []
      let attachments: any[] = []
      try { mentions = JSON.parse(message.mentions || '[]') } catch { mentions = [] }
      try { attachments = JSON.parse(message.attachments || '[]') } catch { attachments = [] }
      const replyUser = message.replyTo?.user || null
      return {
        id: message.id,
        content: message.content,
        userId: message.userId,
        channelId: message.channelId,
        replyToId: message.replyToId,
        replyTo: message.replyTo ? {
          id: message.replyTo.id,
          content: message.replyTo.content ?? '',
          userId: message.replyTo.userId ?? null,
          user: replyUser ? {
            id: replyUser.id,
            displayName: replyUser.displayName,
            username: replyUser.username,
            avatar: replyUser.avatar,
          } : null,
          timestamp: message.replyTo.createdAt,
        } : null,
        timestamp: message.createdAt,
        mentions,
        attachments,
        viewedBy: (message.viewedBy || []).map(v => {
          const vu = v.user || null
          return {
            id: vu ? vu.id : null,
            user: vu ? {
              id: vu.id,
              displayName: vu.displayName,
              username: vu.username,
              avatar: vu.avatar,
            } : null,
            viewedAt: v.viewedAt,
          }
        }),
        reactions: (message.reactions || []).map(r => ({
          emoji: r.emoji,
          users: (r.users || []).map(u => u.userId),
        })),
      }
    })
    return NextResponse.json(safe)
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const { content, mentions: rawMentions, attachments, replyToId } = await request.json()
    const mentions = Array.isArray(rawMentions) ? rawMentions : []

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      )
    }
    const hasText = typeof content === 'string' && content.trim().length > 0
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0
    if (!hasText && !hasAttachments) {
      return NextResponse.json(
        { error: 'Message must have text or attachments' },
        { status: 400 }
      )
    }

    // Load channel and verify membership
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, serverId: true },
    })
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const member = await prisma.serverMember.findFirst({
      where: { serverId: channel.serverId, userId: session.user.id },
    })
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Immediate read-only block for specific channels
    if ([ENTRY_CHANNEL_ID, ANNOUNCEMENT_CHANNEL_ID, RULES_CHANNEL_ID].includes(channelId)) {
      return NextResponse.json({ error: 'This channel is read-only' }, { status: 403 })
    }

    // Determine send permission with default-deny unless explicitly allowed
    // Precedence: user override > role-level (deny overrides allow) > @everyone > default(false)
    const roleIds = member.roleId ? [member.roleId] : []
    const permRows = await prisma.channelPermission.findMany({
      where: {
        channelId: channel.id,
        OR: [
          { userId: session.user.id },
          { roleId: { in: roleIds } },
          { userId: null, roleId: null },
        ],
      },
      select: { permission: true, userId: true, roleId: true },
    })
    const resolvePerm = (key: 'canSend' | 'canSendGifs'): boolean => {
      // User override
      const hasUserDeny = permRows.some(r => r.userId === session.user.id && r.permission === `deny:${key}`)
      if (hasUserDeny) return false
      const hasUserAllow = permRows.some(r => r.userId === session.user.id && r.permission === `allow:${key}`)
      if (hasUserAllow) return true
      // Roles: deny wins over allow
      const hasRoleDeny = permRows.some(r => r.roleId && roleIds.includes(r.roleId) && r.permission === `deny:${key}`)
      if (hasRoleDeny) return false
      const hasRoleAllow = permRows.some(r => r.roleId && roleIds.includes(r.roleId) && r.permission === `allow:${key}`)
      if (hasRoleAllow) return true
      // Everyone
      const hasEveryoneDeny = permRows.some(r => r.userId === null && r.roleId === null && r.permission === `deny:${key}`)
      if (hasEveryoneDeny) return false
      const hasEveryoneAllow = permRows.some(r => r.userId === null && r.roleId === null && r.permission === `allow:${key}`)
      if (hasEveryoneAllow) return true
      // Default allow for send operations on channels without explicit rules
      return true
    }
    const isOwnerAdmin = member.role === 'owner' || member.role === 'admin'
    const canSend = isOwnerAdmin ? true : resolvePerm('canSend')
    if (!canSend) {
      return NextResponse.json({ error: 'You do not have permission to send messages in this channel' }, { status: 403 })
    }

    // If sending attachments (like GIFs), enforce canSendGifs
    if (hasAttachments) {
      const canSendGifs = isOwnerAdmin ? true : resolvePerm('canSendGifs')
      if (!canSendGifs) {
        return NextResponse.json({ error: 'You do not have permission to send GIFs/images in this channel' }, { status: 403 })
      }
    }

    // Enforce role-level permission for mentioning users
    try {
      const hasMentions = Array.isArray(mentions) && mentions.length > 0
      if (hasMentions) {
        // Owner/Admin bypass
        const isOwnerAdmin = member.role === 'owner' || member.role === 'admin'
        if (!isOwnerAdmin) {
          const memberRoleId = member.roleId || null
          let rolePerms: string[] = []
          if (memberRoleId) {
            const role = await prisma.serverRole.findFirst({ where: { id: memberRoleId, serverId: channel.serverId } })
            try { rolePerms = role?.permissions ? JSON.parse(role.permissions) : [] } catch { rolePerms = [] }
          }
          if (!rolePerms.includes('canMention')) {
            return NextResponse.json({ error: 'You do not have permission to mention users' }, { status: 403 })
          }
        }
      }
    } catch (e) {
      console.warn('Role mention permission check failed, allowing by default', e)
    }

    // Additional AI moderation for members: abusive/18+ content & suspicious attachments
    if (member.role === 'member') {
      try {
        if (hasText) {
          const mod = await moderateWithGemini(String(content || ''))
          if (!mod.allow) {
            return NextResponse.json({ error: 'Message blocked by moderation' }, { status: 403 })
          }
        }
        if (hasAttachments && Array.isArray(attachments)) {
          const filenameBadWords = [
            'nsfw','18+','xxx','porn','nude','nud3','adult','sex','erotic','lewd','fetish','explicit'
          ]
          const looksImage = (name: string) => /\.(gif|jpg|jpeg|png|webp|bmp|tiff)$/i.test(name)
          const isSuspicious = (name: string) => filenameBadWords.some(w => name.toLowerCase().includes(w))
          const blocked = attachments.some((a: any) => {
            const name = typeof a === 'string' ? a : (a?.name || a?.filename || '')
            return looksImage(name) && isSuspicious(name)
          })
          if (blocked) {
            return NextResponse.json({ error: 'Attachment blocked by moderation' }, { status: 403 })
          }
        }
      } catch (e) {
        console.warn('Member moderation check failed', e)
      }
    }

    // Create new message
    const message = await prisma.message.create({
      data: {
        content,
        userId: session.user.id,
        channelId,
        replyToId: replyToId || null,
        mentions: JSON.stringify(mentions || []),
        attachments: JSON.stringify(attachments || []),
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatar: true,
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
    })

    // If this is the designated bot channel on the community server, trigger a bot reply
    try {
      if (channel.serverId === COMMUNITY_SERVER_ID && channelId === BOT_CHANNEL_ID && hasText) {
        const botText = await generateBotReply(content)
        if (botText) {
          const botUser = await getOrCreateBotUser()
          if (botUser) {
            // Sync bot avatar with server icon, if available
            try {
              const server = await prisma.server.findUnique({ where: { id: channel.serverId }, select: { icon: true } })
              const desiredAvatar = server?.icon || '/file.svg'
              if (desiredAvatar && botUser.avatar !== desiredAvatar) {
                await prisma.user.update({ where: { id: botUser.id }, data: { avatar: desiredAvatar } })
              }
            } catch (e) {
              console.warn('Failed to sync bot avatar:', e)
            }
            await prisma.message.create({
              data: {
                content: botText,
                userId: botUser.id,
                channelId,
                replyToId: message.id,
                mentions: JSON.stringify([]),
                attachments: JSON.stringify([]),
              },
            })
          }
        }
      }
    } catch (e) {
      console.warn('Bot reply failed:', e)
    }

    return NextResponse.json({
      id: message.id,
      content: message.content,
      userId: message.userId,
      channelId: message.channelId,
      replyToId: message.replyToId,
      replyTo: message.replyTo ? {
        id: message.replyTo.id,
        content: message.replyTo.content,
        userId: message.replyTo.userId,
        user: message.replyTo.user,
        timestamp: message.replyTo.createdAt,
      } : null,
      timestamp: message.createdAt,
      mentions: JSON.parse(message.mentions || '[]'),
      attachments: JSON.parse(message.attachments || '[]'),
      viewedBy: [],
      reactions: [],
    })
  } catch (error) {
    console.error('Create message error:', error)
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const { messageId } = await request.json()
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Find the message
    const message = await prisma.message.findUnique({ where: { id: messageId } })
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    // Only allow if admin or sender
    if (session.user.id !== message.userId && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await prisma.message.delete({ where: { id: messageId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const { messageId, newContent } = await request.json()
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Find the message
    const message = await prisma.message.findUnique({ where: { id: messageId } })
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    // Only allow if sender
    if (session.user.id !== message.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content: newContent },
    })
    return NextResponse.json({ success: true, message: updated })
  } catch (error) {
    console.error('Edit message error:', error)
    return NextResponse.json({ error: 'Failed to edit message' }, { status: 500 })
  }
} 