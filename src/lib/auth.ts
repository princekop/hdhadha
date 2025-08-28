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

  // Auto-join the main community server and post a welcome card in entry channel
  const COMMUNITY_SERVER_ID = 'cmdyince50002dl08h97cn2rb'
  const ENTRY_CHANNEL_ID = 'cmdyiobxt0005dlr8mzn946cb'
  try {
    // Join server if not already a member
    const exists = await prisma.serverMember.findFirst({ where: { serverId: COMMUNITY_SERVER_ID, userId: user.id } })
    if (!exists) {
      await prisma.serverMember.create({
        data: { serverId: COMMUNITY_SERVER_ID, userId: user.id, role: 'member' }
      })
    }
    // Post a welcome profile card as a system message in entry channel
    const card = `👋 Welcome, ${user.displayName || user.username}!` +
      `\n\n` +
      `• Username: @${user.username}` +
      `\n• Check announcements and rules before chatting.`
    type Attachment = { type: 'banner' | 'avatar'; url: string }
    const attachments: Attachment[] = []
    if (user.banner) {
      attachments.push({ type: 'banner', url: user.banner })
    }
    if (user.avatar) {
      attachments.push({ type: 'avatar', url: user.avatar })
    }
    await prisma.message.create({
      data: {
        channelId: ENTRY_CHANNEL_ID,
        userId: user.id,
        content: card,
        mentions: '[]',
        attachments: JSON.stringify(attachments),
      }
    })
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
