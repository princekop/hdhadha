import bcrypt from 'bcryptjs'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { prisma } from './prisma'
import { User, LoginCredentials, RegisterCredentials } from '@/types'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(user: User): string {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      username: user.username 
    },
    process.env.NEXTAUTH_SECRET!,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token: string): JwtPayload | string | null {
  try {
    return jwt.verify(token, process.env.NEXTAUTH_SECRET!) as JwtPayload | string
  } catch (_error) {
    return null
  }
}

export async function authenticateUser(credentials: LoginCredentials): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { email: credentials.email }
  })

  if (!user) {
    return null
  }

  const isValid = await verifyPassword(credentials.password, user.password)
  if (!isValid) return null
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar ?? undefined,
    status: user.status as User['status'],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export async function createUser(credentials: RegisterCredentials): Promise<User> {
  const hashedPassword = await hashPassword(credentials.password)
  
  const user = await prisma.user.create({
    data: {
      email: credentials.email,
      username: credentials.username,
      displayName: credentials.displayName,
      password: hashedPassword,
    }
  })

  // Auto-join the current default server and post a welcome card in its first text channel (if any)
  try {
    const defaultServer = await prisma.server.findFirst({
      where: { isDefault: true },
      include: {
        channels: {
          where: { type: 'text' },
          orderBy: { position: 'asc' },
          select: { id: true },
        },
        roles: {
          where: { isDefault: true },
          select: { id: true },
        },
      },
    })

    if (defaultServer) {
      const membership = await prisma.serverMember.findFirst({ where: { serverId: defaultServer.id, userId: user.id } })
      if (!membership) {
        const defaultRoleId = defaultServer.roles?.[0]?.id
        await prisma.serverMember.create({
          data: {
            serverId: defaultServer.id,
            userId: user.id,
            role: 'member',
            ...(defaultRoleId ? { roleId: defaultRoleId } : {}),
          },
        })
      }

      const entryChannelId = defaultServer.channels[0]?.id
      if (entryChannelId) {
        const card = `👋 Welcome, ${user.displayName || user.username}!` +
          `\n\n` +
          `• Username: @${user.username}` +
          `\n• Check announcements and rules before chatting.`
        type Attachment = { type: 'banner' | 'avatar'; url: string }
        const attachments: Attachment[] = []
        if ((user as any).banner) attachments.push({ type: 'banner', url: (user as any).banner })
        if ((user as any).avatar) attachments.push({ type: 'avatar', url: (user as any).avatar })
        await prisma.message.create({
          data: {
            channelId: entryChannelId,
            userId: user.id,
            content: card,
            mentions: '[]',
            attachments: JSON.stringify(attachments),
          }
        })
      }
    }
  } catch (e) {
    console.warn('Post welcome card failed:', e)
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar ?? undefined,
    status: user.status as User['status'],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { id } })
  return user
    ? {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar ?? undefined,
        status: user.status as User['status'],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    : null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email } })
  return user
    ? {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar ?? undefined,
        status: user.status as User['status'],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    : null
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { username } })
  return user
    ? {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar ?? undefined,
        status: user.status as User['status'],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    : null
}
