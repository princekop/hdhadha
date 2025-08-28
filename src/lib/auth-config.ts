import type { NextAuthOptions, Session, User as NextAuthUser } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import { authenticateUser } from './auth'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await authenticateUser({
          email: credentials.email,
          password: credentials.password
        })

        if (!user) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar || '',
          // ensure boolean to satisfy NextAuth User typing
          isAdmin: !!user.isAdmin,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT & { sub?: string; id?: string; username?: string; displayName?: string; avatar?: string; isAdmin?: boolean }; user?: NextAuthUser }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.displayName = user.displayName
        token.avatar = (user as NextAuthUser & { avatar?: string }).avatar ?? ''
        token.isAdmin = (user as NextAuthUser & { isAdmin?: boolean }).isAdmin ?? false
        return token
      }
      // No user object (subsequent requests). Ensure token has fresh values from DB (handles admin toggles post-login)
      try {
        const userId = (token.sub || token.id) as string | undefined
        if (userId) {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, displayName: true, avatar: true, isAdmin: true },
          })
          if (dbUser) {
            token.id = dbUser.id
            token.username = dbUser.username
            token.displayName = dbUser.displayName
            token.avatar = dbUser.avatar ?? ''
            token.isAdmin = dbUser.isAdmin
          }
        }
      } catch {}
      return token
    },
    async session({ session, token }: { session: Session; token: JWT & { sub?: string; id?: string; username?: string; displayName?: string; avatar?: string; isAdmin?: boolean } }) {
      if (token) {
        session.user.id = (token.id ?? token.sub ?? '') as string
        session.user.username = (token.username ?? '') as string
        session.user.displayName = (token.displayName ?? '') as string
        session.user.avatar = (token.avatar ?? '') as string
        session.user.isAdmin = Boolean(token.isAdmin)
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET
} 