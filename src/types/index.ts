export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  banner?: string;
  // Optional admin flag; present for privileged users
  isAdmin?: boolean;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  createdAt: Date;
  updatedAt: Date;
}

export interface Server {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'announcement';
  serverId: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  content: string;
  channelId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServerMember {
  id: string;
  userId: string;
  serverId: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joinedAt: Date;
}

export interface DirectMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatar?: string;
    // surfaced by NextAuth session callback when available
    isAdmin?: boolean;
  };
  expires: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  banner?: string;
  isAdmin?: boolean;
  status: 'online' | 'idle' | 'dnd' | 'offline';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}