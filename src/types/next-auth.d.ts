import type { DefaultSession, DefaultUser } from "next-auth"
import type { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string
      username: string
      displayName: string
      avatar: string
      isAdmin: boolean
    }
  }

  interface User extends DefaultUser {
    id: string
    username: string
    displayName: string
    avatar: string
    isAdmin: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    username: string
    displayName: string
    avatar: string
    isAdmin: boolean
  }
}