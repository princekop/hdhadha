'use client'
import ResizeHandle from '@/components/ResizeHandle'
import ChannelCustomizationModal from '@/components/ChannelCustomizationModal'
import VoiceChannelModal from '@/components/VoiceChannelModal'
import VoiceChannel from '@/components/VoiceChannel'
import UserProfileModal from '@/components/UserProfileModal'
import { io, Socket } from 'socket.io-client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use, useRef, useMemo } from 'react'
import { 
  Hash, 
  Mic, 
  Volume2, 
  Settings, 
  Plus, 
  Crown, 
  Users, 
  MessageSquare,
  Bell,
  Shield,
  MoreHorizontal,
  UserPlus,
  Edit3,
  Trash2,
  LogOut,
  ArrowLeft,
  Zap,
  Star,
  Copy,
  Download,
  Upload,
  Palette,
  Image as ImageIcon,
  FileText,
  Key,
  Users2,
  BookOpen,
  Sparkles,
  Gift,
  Target,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Globe,
  Home,
  Server as ServerIcon,
  ChevronDown,
  ChevronRight,
  Star as StarIcon,
  Settings as SettingsIcon,
  UserCheck,
  UserX,
  Ban,
  Award,
  Flag,
  Shield as ShieldIcon,
  Zap as ZapIcon,
  Diamond,
  Gem,
  Smile,
  Paperclip,
  Send,
  Clock,
  Check,
  CheckCheck,
  AtSign,
  VolumeX,
  Headphones,
  Video,
  Phone,
  MoreVertical,
  X,
  Folder,
  File,
  Video as VideoIcon,
  Music,
  Archive,
  Calendar,
  MapPin,
  Link,
  ExternalLink,
  Heart,
  ThumbsUp,
  MessageCircle,
  Share,
  Bookmark,
  Flag as FlagIcon,
  AlertTriangle,
  Info,
  HelpCircle,
  Star as StarFilled,
  Zap as ZapIcon2,
  Gift as GiftIcon,
  Sparkles as SparklesIcon,
  Crown as CrownIcon,
  Shield as ShieldIcon2,
  Users as UsersIcon,
  Settings as SettingsIcon2,
  Palette as PaletteIcon,
  Bell as BellIcon,
  Volume as VolumeIcon,
  Mic as MicIcon,
  MicOff,
  Volume1,
  Volume2 as Volume2Icon,
  Headphones as HeadphonesIcon,
  Video as VideoIcon2,
  Phone as PhoneIcon,
  PhoneOff,
  VideoOff,
  Monitor,
  MonitorOff,
  Smartphone,
  Tablet,
  Laptop,
  Wifi,
  WifiOff,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  Power,
  PowerOff,
  Moon,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Thermometer,
  Droplets,
  Umbrella,
  Sun as SunIcon,
  Moon as MoonIcon,
  Cloud as CloudIcon,
  CloudRain as CloudRainIcon,
  CloudSnow as CloudSnowIcon,
  CloudLightning as CloudLightningIcon,
  Wind as WindIcon,
  Thermometer as ThermometerIcon,
  Droplets as DropletsIcon,
  Umbrella as UmbrellaIcon,
  Loader2,
  Reply,
  SmilePlus,
  Menu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import EmojiPicker from 'emoji-picker-react'
import { format, isToday, isSameDay, formatDistanceToNow } from 'date-fns'
import AuroraLoader from '@/components/AuroraLoader'
const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || 'DOctJdRwATKdIMckvWjAkErKftp38oFJ'
import Avatar from '@/components/Avatar'
import { computeEffectivePresence, presenceColorClass } from '@/lib/presence'
 

interface ServerPageProps {
  params: Promise<{ serverId: string }>
}

interface Message {
  id: string
  content: string
  userId: string
  channelId: string
  replyToId?: string
  replyTo?: {
    id: string
    content: string
    userId: string
    user: {
      id: string
      displayName: string
      username: string
      avatar?: string
    }
    timestamp: Date
  }
  timestamp: Date
  mentions: string[]
  attachments: string[]
  viewedBy: string[]
  reactions: { emoji: string; users: string[] }[]
}

interface Channel {
  id: string
  name: string
  type: 'text' | 'voice' | 'announcement'
  categoryId: string
  unread: number
  isPrivate: boolean
  backgroundType?: string
  backgroundUrl?: string
  backgroundColor?: string
  permissions: {
    read: string[]
    write: string[]
    manage: string[]
  }
}

interface Category {
  id: string
  name: string
  emoji?: string
  font?: string
  channels: Channel[]
}

interface Member {
  id: string
  name: string
  avatar: string | null
  status: 'online' | 'idle' | 'dnd' | 'offline'
  role: 'owner' | 'admin' | 'member'
  roleId?: string | null
  username: string
  joinedAt: Date
  isAdmin: boolean
  avatarDecoration?: string | null
}

interface RoleItem {
  id: string
  name: string
  color?: string
}

type PermissionRow = {
  id?: string
  roleId: string | null
  userId: string | null
  canRead: boolean | null
  canSend: boolean | null
  canSendGifs: boolean | null
  canReact: boolean | null
}

export default function ServerPage({ params }: ServerPageProps) {
  const { serverId } = use(params)
  
  console.log('ServerPage rendered with serverId:', serverId)
  const { data: session, status } = useSession()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  // Refs for popovers/widgets to enable click-outside-to-close
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const gifPickerRef = useRef<HTMLDivElement>(null)
  const mentionBoxRef = useRef<HTMLDivElement>(null)
  // Scroll container ref and UI state
  const messagesListRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const lastNotifiedIdRef = useRef<string | null>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [canScrollUp, setCanScrollUp] = useState(false)
  
  const [server, setServer] = useState<any>(null)
  // Sanitized banner URL derived from server.banner
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  
  // Debug effect to log server state changes
  useEffect(() => {
    console.log('Server state changed:', server)
    if (server) {
      console.log('Server icon URL:', server.icon)
      console.log('Server banner URL:', server.banner)
    }
  }, [server])

  // Fetch server data function
  const fetchServer = async () => {
    try {
      const response = await fetch(`/api/servers/${serverId}`)
      if (response.ok) {
        const serverData = await response.json()
        console.log('Fetched server data:', serverData)
        console.log('Server icon:', serverData.icon)
        console.log('Server banner:', serverData.banner)
        setServer(serverData)
      }
    } catch (error) {
      console.error('Error fetching server:', error)
    }
  }

  // Helper: delete a category via API and update local UI
  const deleteCategory = async (categoryId: string, name?: string) => {
    if (!categoryId) return
    if (!confirm(`Delete category${name ? ` "${name}"` : ''}? This will delete its channels.`)) return
    try {
      const res = await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any))
        console.error('Failed to delete category', res.status, err)
        alert('Failed to delete category')
        return
      }
      setCategories((prev: Category[]) => prev.filter((c: Category) => c.id !== categoryId))
    } catch (e) {
      console.error('Error deleting category', e)
      alert('Error deleting category')
    }
  }

  // Helper: delete a channel via API and update local UI
  const deleteChannel = async (channelId: string, name?: string) => {
    if (!channelId) return
    if (!confirm(`Delete channel${name ? ` "${name}"` : ''}?`)) return
    try {
      const res = await fetch(`/api/channels/${channelId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any))
        console.error('Failed to delete channel', res.status, err)
        alert('Failed to delete channel')
        return
      }
      setCategories((prev: Category[]) => prev.map((cat: Category) => ({
        ...cat,
        channels: (cat.channels || []).filter((ch: Channel) => ch.id !== channelId)
      })))
      setSelectedChannel(prev => (prev === channelId ? '' : prev))
    } catch (e) {
      console.error('Error deleting channel', e)
      alert('Error deleting channel')
    }
  }

  // Role Permissions (server-level role capabilities)
  const [showRolePermsModal, setShowRolePermsModal] = useState(false)
  const [selectedRolePermsId, setSelectedRolePermsId] = useState<string | null>(null)
  const [rolePerms, setRolePerms] = useState<string[]>([])
  const [rolePermsLoading, setRolePermsLoading] = useState(false)

  const DEFAULT_ROLE_PERMS = [
    'canMention',
    'canManage',
    'canDeleteOthers',
    'canReact',
    'canSendGifs',
    'canEdit',
    // Extended set
    'canAttachFiles',
    'canCreateChannels',
    'canManageRoles',
    'canKick',
    'canBan',
    'canManageMessages',
  ]

  const openRolePerms = async (roleId?: string) => {
    const firstId = roleId || roles[0]?.id || null
    if (!firstId) {
      setSelectedRolePermsId(null)
      setRolePerms([])
      setShowRolePermsModal(true)
      return
    }
    setSelectedRolePermsId(firstId)
    setShowRolePermsModal(true)
    await loadRolePerms(firstId)
  }

  const loadRolePerms = async (roleId: string) => {
    try {
      setRolePermsLoading(true)
      const res = await fetch(`/api/servers/${serverId}/roles/${roleId}/permissions`)
      if (!res.ok) throw new Error('Failed to fetch role permissions')
      const data = await res.json()
      const perms: string[] = Array.isArray(data.permissions) ? data.permissions : []
      setRolePerms(perms)
    } catch (e) {
      console.error('Load role perms error', e)
      setRolePerms([])
    } finally {
      setRolePermsLoading(false)
    }
  }

  const saveRolePerms = async () => {
    if (!selectedRolePermsId) return
    try {
      setRolePermsLoading(true)
      await fetch(`/api/servers/${serverId}/roles/${selectedRolePermsId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: rolePerms }),
      })
      setShowRolePermsModal(false)
    } catch (e) {
      console.error('Save role perms error', e)
    } finally {
      setRolePermsLoading(false)
    }
  }

  const toggleRolePerm = (key: string) => {
    setRolePerms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }


  // Generate invite using current expiresIn selection
  const generateInvite = async () => {
    if (!serverId) return
    setInviteGenerating(true)
    setInviteUrl(null)
    try {
      const payload: any = { serverId }
      // Pass expiresIn in seconds; allow null for never
      payload.expiresIn = expiresIn
      // Pass maxUses; allow null for unlimited
      payload.maxUses = maxUses
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to create invite')
      const invite = await res.json()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const url = `${origin}/invite/${invite.code}`
      setInviteUrl(url)
    } catch (err) {
      console.error('Create invite error:', err)
    } finally {
      setInviteGenerating(false)
    }
  }

  // Copy the current invite URL
  const copyInviteLink = async () => {
    if (!inviteUrl) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl)
        setInviteCopied(true)
        setTimeout(() => setInviteCopied(false), 1500)
      }
    } catch (err) {
      console.error('Copy invite link error:', err)
    }
  }

  // Copy server ID to clipboard
  const handleCopyServerId = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(serverId)
        setServerIdCopied(true)
        setTimeout(() => setServerIdCopied(false), 1200)
      }
    } catch (err) {
      console.error('Copy server ID error:', err)
    }
  }

  // Derive and validate bannerUrl from server.banner
  useEffect(() => {
    let img: HTMLImageElement | null = null
    let objectUrl: string | null = null
    const b = (server as any)?.banner
    if (!b) {
      setBannerUrl(null)
      return
    }

    // Helper to commit URL after preload
    const trySet = (url: string) => {
      if (typeof window === 'undefined') {
        setBannerUrl(url)
        return
      }
      const i = new window.Image()
      i.onload = () => setBannerUrl(url)
      i.onerror = () => setBannerUrl(null)
      i.src = url
      img = i
    }

    if (typeof b === 'string') {
      let raw = b.trim()
      // Extract from css url(...) wrappers
      const cssUrlMatch = raw.match(/url\(([^)]+)\)/i)
      if (cssUrlMatch) raw = cssUrlMatch[1]
      // Strip quotes
      raw = raw.replace(/^['"]/,'').replace(/['"]$/,'')
      // Normalize backslashes
      raw = raw.replace(/\\/g, '/')
      // Tokenize and clean
      const tokens = raw
        .split(/[\s,|]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => s.replace(/[)\];,'"]+$/g, ''))

      const imageLike = /\.(gif|png|jpe?g|webp|svg|bmp|tiff)(\?.*)?$/i
      let candidate =
        tokens.find(s => imageLike.test(s)) ||
        tokens.find(s => /^uploads\//i.test(s)) ||
        tokens.find(s => /^(https?:\/\/|blob:|data:|\/|\.\/|\.\.\/)/i.test(s)) ||
        tokens[0] || ''

      // Add scheme for bare domains
      if (/^[\w.-]+\.[A-Za-z]{2,}\/\S+/.test(candidate) && !/^https?:\/\//i.test(candidate)) {
        candidate = `https://${candidate}`
      }
      if (/^uploads\//i.test(candidate)) candidate = `/${candidate}`
      candidate = candidate.replace(/\s/g, '%20')
      trySet(candidate)
      return () => {
        if (img) { img.onload = null; img.onerror = null }
      }
    }

    if (typeof window !== 'undefined' && (b instanceof Blob)) {
      objectUrl = URL.createObjectURL(b)
      trySet(objectUrl)
      return () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        if (img) { img.onload = null; img.onerror = null }
      }
    }

    setBannerUrl(null)
    return () => {}
  }, [server])

  // Fetch categories function
  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/servers/${serverId}/categories`)
      if (response.ok) {
        const categoriesData = await response.json()
        setCategories(categoriesData)
        // Set expanded categories for all categories
        setExpandedCategories(categoriesData.map((cat: any) => cat.id))
        // Set first channel as selected if available
        if (categoriesData.length > 0 && categoriesData[0].channels.length > 0) {
          setSelectedChannel(prev => prev || categoriesData[0].channels[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // Fetch members function
  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/servers/${serverId}/members`)
      if (response.ok) {
        const membersData = await response.json()
        setMembers(membersData)
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  // Fetch roles function
  const fetchRoles = async () => {
    try {
      const res = await fetch(`/api/servers/${serverId}/roles`)
      if (!res.ok) return
      const data = await res.json()
      const items = Array.isArray(data)
        ? data.map((r: any) => ({ id: r.id, name: r.name, color: r.color }))
        : []
      setRoles(items)
    } catch (e) {
      console.error('Error fetching roles:', e)
      setRoles([])
    }
  }

  // Fetch messages function
  const fetchMessages = async () => {
    try {
      setMessagesLoading(true)
      const response = await fetch(`/api/channels/${selectedChannel}/messages`)
      if (response.ok) {
        const messagesData = await response.json()
        setMessages(Array.isArray(messagesData) ? messagesData : [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }
  
  const [categories, setCategories] = useState<Category[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [selectedChannel, setSelectedChannel] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  // Effective channel permissions for current user (null = unknown)
  const [canSend, setCanSend] = useState<boolean | null>(null)
  const [canSendGifs, setCanSendGifs] = useState<boolean | null>(null)
  const [canReact, setCanReact] = useState<boolean | null>(null)
  const [showServerMenu, setShowServerMenu] = useState(false)
  const [showServerSettings, setShowServerSettings] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState(['cat1', 'cat2'])
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categoryEmoji, setCategoryEmoji] = useState('')
  const [channelName, setChannelName] = useState('')
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifSearchQuery, setGifSearchQuery] = useState('')
  const [gifResults, setGifResults] = useState<any[]>([])
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [showMessageMenu, setShowMessageMenu] = useState(false)
  const [messageMenuPosition, setMessageMenuPosition] = useState({ x: 0, y: 0 })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [serverIdCopied, setServerIdCopied] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteGenerating, setInviteGenerating] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [expiresIn, setExpiresIn] = useState<number | null>(604800) // default 7 days
  const [maxUses, setMaxUses] = useState<number | null>(1000)
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState(0)
  const [mentionSuggestions, setMentionSuggestions] = useState<Member[]>([])
  const [cursorPosition, setCursorPosition] = useState(0)
  // Sorted members for right sidebar: owners/admins at top, then by status (online->idle->dnd->offline), then by name
  const sortedMembers = useMemo(() => {
    const roleRank = (m: Member) => (m.role === 'owner' ? 2 : m.role === 'admin' ? 1 : 0)
    const statusRank = (s: Member['status']) => (s === 'online' ? 3 : s === 'idle' ? 2 : s === 'dnd' ? 1 : 0)
    return [...members].sort((a, b) => {
      const rdiff = roleRank(b) - roleRank(a)
      if (rdiff !== 0) return rdiff
      const sdiff = statusRank(b.status) - statusRank(a.status)
      if (sdiff !== 0) return sdiff
      const an = (a.name || a.username || '').toLowerCase()
      const bn = (b.name || b.username || '').toLowerCase()
      return an.localeCompare(bn)
    })
  }, [members])
  const [contextMenu, setContextMenu] = useState<{
    show: boolean
    x: number
    y: number
    type: 'category' | 'channel' | 'member' | 'message' | 'user'
    data?: any
  }>({ show: false, x: 0, y: 0, type: 'category' })
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Member | null>(null)
  const [profileContext, setProfileContext] = useState<'chat' | 'sidebar' | 'landscape'>('chat')
  const [userProfileData, setUserProfileData] = useState({
    displayName: '',
    status: 'online' as 'online' | 'idle' | 'dnd' | 'offline',
    avatar: '',
    banner: '',
    description: '',
    bannerColor: 'from-purple-500 to-blue-500',
    avatarDecoration: null as string | null,
    createdAt: '' as string
  })

  // New state for adjustable sidebar and modals
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [showChannelCustomization, setShowChannelCustomization] = useState(false)
  const [showVoiceChannelModal, setShowVoiceChannelModal] = useState(false)
  const [selectedChannelForCustomization, setSelectedChannelForCustomization] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [contextMenuState, setContextMenuState] = useState<{ x: number; y: number; show: boolean; message: Message | null }>({ x: 0, y: 0, show: false, message: null });
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  // Show/hide right members sidebar (Discord-like toggle)
  const [showMembers, setShowMembers] = useState(true)
  type PingNotification = {
    id: string
    messageId: string
    channelId: string
    content: string
    fromUser: string
    createdAt: number
    kind: 'mention' | 'reply'
  }
  const [notifications, setNotifications] = useState<PingNotification[]>([])
  const [editLoading, setEditLoading] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null)
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [forwardTargetChannel, setForwardTargetChannel] = useState('')
  const [showReadReceipts, setShowReadReceipts] = useState(false)
  const [readReceiptsData, setReadReceiptsData] = useState<any>(null)
  const [readReceiptsLoading, setReadReceiptsLoading] = useState(false)


  // Lightweight message formatting: **bold**, *italic*, > blockquote, ||spoiler||
  const escapeHtml = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  const formatInline = (s: string) => {
    // spoilers first to avoid interfering with other markers inside
    s = s.replace(/\|\|([^|]+)\|\|/g, '<span class="blur-[3px] hover:blur-0 transition rounded px-1 bg-gray-700/60">$1</span>')
    // bold **text**
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1<\/strong>')
    // italic *text*
    s = s.replace(/(^|\W)\*([^*]+)\*/g, '$1<em>$2<\/em>')
    return s
  }

  const formatMessageHtml = (content: string) => {
    const escaped = escapeHtml(content || '')
    const lines = escaped.split(/\r?\n/)
    const html = lines.map(line => {
      if (line.startsWith('&gt;')) {
        const inner = line.replace(/^&gt;\s?/, '')
        return `<blockquote class="border-l-4 border-gray-600 pl-3 ml-1 text-gray-300 italic">${formatInline(inner)}<\/blockquote>`
      }
      return `<div>${formatInline(line)}<\/div>`
    }).join('')
    return { __html: html }
  }

  // Voice presence (sidebar peek)
  const voicePresenceRef = useRef<Record<string, number>>({})
  const [voicePresence, setVoicePresence] = useState<Record<string, number>>({})
  const voicePeersRef = useRef<Record<string, any[]>>({})
  const [voicePeers, setVoicePeers] = useState<Record<string, any[]>>({})
  const signalSocketRef = useRef<Socket | null>(null)
  const SIGNAL_URL = useMemo(() => {
    const env = process.env.NEXT_PUBLIC_VOICE_SIGNAL_URL as string | undefined
    // Only use explicit, valid URLs; otherwise disable signaling
    if (env && !env.includes('<') && !env.includes('your-host')) return env
    return null as unknown as string
  }, [])

  // Connect lightweight signaling socket for presence peek
  useEffect(() => {
    if (!SIGNAL_URL) return
    if (signalSocketRef.current) return
    try {
      const s = io(SIGNAL_URL, {
        transports: ['websocket', 'polling'],
        forceNew: true,
        withCredentials: false,
        timeout: 12000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1500,
        path: '/socket.io'
      })
      signalSocketRef.current = s
      s.on('connect_error', (e: any) => console.warn('[peek] connect_error (silenced)', e?.message || e))
      s.on('peers-of', ({ roomId, peers }: any) => {
        if (!roomId) return
        const list = Array.isArray(peers) ? peers : []
        voicePresenceRef.current = { ...voicePresenceRef.current, [roomId]: list.length }
        voicePeersRef.current = { ...voicePeersRef.current, [roomId]: list }
        setVoicePresence({ ...voicePresenceRef.current })
        setVoicePeers({ ...voicePeersRef.current })
      })
    } catch {}
    return () => {
      signalSocketRef.current?.disconnect()
      signalSocketRef.current = null
    }
  }, [SIGNAL_URL])

  // Periodically peek presence for all voice channels in current category list
  useEffect(() => {
    if (!categories || categories.length === 0) return
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      const s = signalSocketRef.current
      if (!s) return
      const voiceIds = categories.flatMap((cat: any) => (cat.channels || []).filter((ch: any) => ch.type === 'voice').map((ch: any) => ch.id))
      voiceIds.forEach((id: string) => s.emit('peek', { roomId: id }))
    }
    tick()
    const h = setInterval(tick, 2000)
    return () => { cancelled = true; clearInterval(h) }
  }, [categories])

  // Channel/Category Permissions
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [permissions, setPermissions] = useState<PermissionRow[]>([])
  const [permissionsTarget, setPermissionsTarget] = useState<{ type: 'channel' | 'category', id: string, name?: string } | null>(null)

  const openChannelPermissions = async (channel: any) => {
    setPermissionsTarget({ type: 'channel', id: channel.id, name: channel.name })
    setShowPermissionsModal(true)
    try {
      setPermissionsLoading(true)
      const res = await fetch(`/api/channels/${channel.id}/permissions`)
      const data = res.ok ? await res.json() : []
      // normalize include @everyone row
      const base: PermissionRow[] = Array.isArray(data) ? data.map((p: any) => ({
        id: p.id,
        roleId: p.roleId ?? null,
        userId: p.userId ?? null,
        canRead: p.canRead ?? null,
        canSend: p.canSend ?? null,
        canSendGifs: p.canSendGifs ?? null,
        canReact: p.canReact ?? null,
      })) : []
      if (!base.some(r => r.roleId === null && r.userId === null)) {
        base.unshift({ roleId: null, userId: null, canRead: null, canSend: null, canSendGifs: null, canReact: null })
      }
      setPermissions(base)
    } catch (e) {
      console.error('Failed to load channel permissions', e)
      setPermissions([{ roleId: null, userId: null, canRead: null, canSend: null, canSendGifs: null, canReact: null }])
    } finally {
      setPermissionsLoading(false)
    }
  }

  const openCategoryPermissions = async (category: any) => {
    // For MVP, we edit permissions template and apply to all channels in category on Save
    setPermissionsTarget({ type: 'category', id: category.id, name: category.name })
    setShowPermissionsModal(true)
    // Start with empty template
    setPermissions([{ roleId: null, userId: null, canRead: null, canSend: null, canSendGifs: null, canReact: null }])
  }

  const togglePerm = (rowIndex: number, key: keyof Pick<PermissionRow, 'canRead'|'canSend'|'canSendGifs'|'canReact'>) => {
    setPermissions(prev => prev.map((r, i) => i === rowIndex ? { ...r, [key]: r[key] === true ? false : (r[key] === false ? null : true) } : r))
  }

  const ensureRoleRows = () => {
    // Ensure we render entries for all roles + everyone
    const roleRows: PermissionRow[] = roles.map(r => {
      const found = permissions.find(p => p.roleId === r.id && p.userId === null)
      return found ?? { roleId: r.id, userId: null, canRead: null, canSend: null, canSendGifs: null, canReact: null }
    })
    const everyone = permissions.find(p => p.roleId === null && p.userId === null) ?? { roleId: null, userId: null, canRead: null, canSend: null, canSendGifs: null, canReact: null }
    return [everyone, ...roleRows]
  }

  const savePermissions = async () => {
    if (!permissionsTarget) return
    const entries = ensureRoleRows()
    try {
      setPermissionsLoading(true)
      if (permissionsTarget.type === 'channel') {
        await fetch(`/api/channels/${permissionsTarget.id}/permissions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries }),
        })
      } else {
        // Apply to all channels in category
        const category = categories.find(c => c.id === permissionsTarget.id)
        if (category) {
          await Promise.all((category.channels || []).map(ch => fetch(`/api/channels/${ch.id}/permissions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entries })
          })))
        }
      }
      setShowPermissionsModal(false)
    } catch (e) {
      console.error('Failed to save permissions', e)
    } finally {
      setPermissionsLoading(false)
    }
  }

  // Compute admin/owner flags for current user
  const meId = (session?.user as any)?.id as string | undefined
  const meIsAdmin = useMemo(() => {
    if (!meId || !server) return false
    const me = members.find(m => m.id === meId)
    return server.ownerId === meId || !!me?.isAdmin || me?.role === 'admin'
  }, [meId, server, members])
  // Example usage: manage roles if admin/owner
  const canManageRoles = !!meIsAdmin

  // Assign or remove a role for a member (userId)
  const handleMemberRoleChange = async (userId: string, roleId: string | null) => {
    try {
      const res = await fetch(`/api/servers/${serverId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId }),
      })
      if (!res.ok) return
      // Optimistic UI: update member roleId locally
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, roleId } : m))
    } catch (e) {
      console.error('Failed to update member role', e)
    }
  }

  // Appearance settings
  type UiScale = 'small' | 'medium' | 'large'
  const [appearance, setAppearance] = useState({
    gradient: 'from-gray-900 via-black to-gray-900',
    sidebar: 'black', // 'black' | 'slate'
    uiScale: 'medium' as UiScale,
  })
  const uiScaleClass = appearance.uiScale === 'small' ? 'text-[14px]' : appearance.uiScale === 'large' ? 'text-[18px]' : 'text-[16px]'
  const sidebarBgClass = appearance.sidebar === 'slate' ? 'bg-slate-900/50' : 'bg-black/40'

  // Appearance (localStorage-backed) to match the Appearance page
  const [theme, setTheme] = useState<string>('default')
  const [chatBgUrl, setChatBgUrl] = useState<string>('')
  const [chatBgOpacity, setChatBgOpacity] = useState<number>(30)
  const [blur, setBlur] = useState<number>(0)
  const [useCustomGradient, setUseCustomGradient] = useState<boolean>(false)
  const [fromColor, setFromColor] = useState<string>('#5b21b6')
  const [viaColor, setViaColor] = useState<string>('#00000000')
  const [toColor, setToColor] = useState<string>('#1e3a8a')
  const [fontScale, setFontScale] = useState<number>(100)
  const [vignette, setVignette] = useState<number>(0)
  const [appearanceLoaded, setAppearanceLoaded] = useState<boolean>(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('db_appearance')
      if (saved) {
        const obj = JSON.parse(saved)
        if (obj.theme) setTheme(obj.theme)
        if (typeof obj.chatBgUrl === 'string') setChatBgUrl(obj.chatBgUrl)
        if (typeof obj.chatBgOpacity === 'number') setChatBgOpacity(obj.chatBgOpacity)
        if (typeof obj.blur === 'number') setBlur(obj.blur)
        if (typeof obj.useCustomGradient === 'boolean') setUseCustomGradient(obj.useCustomGradient)
        if (typeof obj.fromColor === 'string') setFromColor(obj.fromColor)
        if (typeof obj.viaColor === 'string') setViaColor(obj.viaColor)
        if (typeof obj.toColor === 'string') setToColor(obj.toColor)
        if (typeof obj.fontScale === 'number') setFontScale(obj.fontScale)
        if (typeof obj.vignette === 'number') setVignette(obj.vignette)
      }
      setAppearanceLoaded(true)
    } catch {}
  }, [])

  useEffect(() => {
    if (!appearanceLoaded) return
    try {
      const obj = { theme, chatBgUrl, chatBgOpacity, blur, useCustomGradient, fromColor, viaColor, toColor, fontScale, vignette }
      localStorage.setItem('db_appearance', JSON.stringify(obj))
    } catch {}
  }, [appearanceLoaded, theme, chatBgUrl, chatBgOpacity, blur, useCustomGradient, fromColor, viaColor, toColor, fontScale, vignette])

  const themeOverlayClass = useMemo(() => {
    switch (theme) {
      case 'cyber':
        return 'from-fuchsia-900/25 via-transparent to-cyan-900/25'
      case 'sunset':
        return 'from-orange-900/25 via-transparent to-pink-900/25'
      case 'emerald':
        return 'from-emerald-900/25 via-transparent to-teal-900/25'
      case 'neon':
        return 'from-lime-900/25 via-transparent to-yellow-900/25'
      case 'ocean':
        return 'from-cyan-900/25 via-transparent to-blue-900/25'
      case 'forest':
        return 'from-green-900/25 via-transparent to-emerald-900/25'
      case 'midnight':
        return 'from-indigo-900/25 via-transparent to-slate-900/25'
      case 'lava':
        return 'from-red-900/25 via-transparent to-orange-900/25'
      case 'aurora':
        return 'from-emerald-900/25 via-transparent to-fuchsia-900/25'
      case 'pastel':
        return 'from-pink-900/15 via-transparent to-sky-900/15'
      case 'royal':
        return 'from-violet-900/25 via-transparent to-indigo-900/25'
      case 'default':
      default:
        return 'from-purple-900/20 via-transparent to-blue-900/20'
    }
  }, [theme])

  // Giphy search
  const searchGifs = async (query: string) => {
    const q = (query || '').trim()
    if (!q) return
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=pg-13`)
      const data = await res.json()
      setGifResults(Array.isArray(data?.data) ? data.data : [])
    } catch (e) {
      console.error('Giphy search error:', e)
      setGifResults([])
    }
  }

  const handleGifSelect = async (gif: any) => {
    try {
      const url = gif?.images?.original?.url || gif?.images?.fixed_height?.url
      if (!url || !selectedChannel) return
      if (canSendGifs === false) {
        setShowGifPicker(false)
        return
      }
      // Send as attachment-only message for clean rendering
      const res = await fetch(`/api/channels/${selectedChannel}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '', attachments: [url] }),
      })
      if (res.ok) {
        // Optimistic update: append returned message to list to feel instant
        const created = await res.json()
        setMessages(prev => [...prev, created])
        // Scroll to bottom smoothly
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      } else if (res.status === 403) {
        setCanSendGifs(false)
      } else {
        // fallback: put URL into input
        setNewMessage(prev => (prev ? `${prev} ${url}` : url))
      }
    } catch (e) {
      console.error('Send GIF error:', e)
    } finally {
      setShowGifPicker(false)
    }
  }

  // Reactions
  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      if (canReact === false) return
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, action: 'toggle' }),
      })
      if (!res.ok) {
        if (res.status === 403) setCanReact(false)
        return
      }
      const data = await res.json()
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: data.reactions || [] } : m))
    } catch (e) {
      console.error('Toggle reaction error:', e)
    } finally {
      setReactionPickerFor(null)
    }
  }

    useEffect(() => {
      if (status === 'loading') return

      if (!session) {
        router.push('/login')
        return
      }

      // Fetch initial data
      fetchServer()
      fetchCategories()
      fetchMembers()
      fetchRoles()
      
      // Fetch messages if channel is selected
      if (selectedChannel) {
        fetchMessages()
      }
    }, [session, status, serverId, selectedChannel, router])

  // Fetch messages when selectedChannel changes
  useEffect(() => {
    if (!selectedChannel) return;
    // Reset effective permission hints for new channel; will be learned on first 403
    setCanSend(null)
    setCanSendGifs(null)
    setCanReact(null)
    setMessagesLoading(true);
    fetch(`/api/channels/${selectedChannel}/messages`)
      .then(res => res.json())
      .then(data => setMessages(Array.isArray(data) ? data : []))
      .catch(error => {
        console.error('Error fetching messages:', error)
        setMessages([])
      })
      .finally(() => setMessagesLoading(false));
  }, [selectedChannel]);

  // Fetch effective permissions on channel change to initialize UI gating immediately
  useEffect(() => {
    if (!selectedChannel) return
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch(`/api/channels/${selectedChannel}/me/permissions`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (typeof data.canSend === 'boolean') setCanSend(data.canSend)
        if (typeof data.canSendGifs === 'boolean') setCanSendGifs(data.canSendGifs)
        if (typeof data.canReact === 'boolean') setCanReact(data.canReact)
      } catch (e) {
        // noop
      }
    }
    run()
    return () => { cancelled = true }
  }, [selectedChannel])

  // Short polling for near real-time message updates (deduped by id)
  useEffect(() => {
    if (!selectedChannel) return
    let cancelled = false
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/channels/${selectedChannel}/messages`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled || !Array.isArray(data)) return
        setMessages(prev => {
          const map = new Map<string, any>()
          ;[...prev, ...data].forEach((m: any) => map.set(m.id, m))
          const merged = Array.from(map.values())
          merged.sort((a: any, b: any) => new Date(a.timestamp || a.createdAt).getTime() - new Date(b.timestamp || b.createdAt).getTime())
          return merged
        })
      } catch {}
    }, 1500)
    return () => { cancelled = true; clearInterval(interval) }
  }, [selectedChannel])

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setSidebarWidth(window.innerWidth)
        setShowMobileSidebar(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    // Update last seen message id for notifications
    if (messages && messages.length) {
      lastMessageIdRef.current = messages[messages.length - 1]?.id ?? null
    }
  }, [messages])

  // Handle scroll state for showing control buttons
  const handleMessagesScroll = () => {
    const el = messagesListRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollToBottom(distanceFromBottom > 80)
    setCanScrollUp(el.scrollTop > 10)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollUpPage = () => {
    const el = messagesListRef.current
    if (!el) return
    el.scrollTo({ top: Math.max(0, el.scrollTop - el.clientHeight * 0.9), behavior: 'smooth' })
  }

  // Request notification permission once
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
    }
  }, [])

  // Notify on pings or replies to current user
  useEffect(() => {
    if (!messages || !messages.length) return
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    const me = (session?.user as any)
    if (!me) return

    const latest = messages[messages.length - 1]
    if (!latest) return
    const content = latest.content || ''
    const mentioned = content.includes(`@${me.username}`)
    const repliedToMe = Boolean(latest.replyTo && latest.replyTo.user?.id === me.id)

    const fromOther = latest.userId !== me.id
    if (fromOther && (mentioned || repliedToMe) && latest.id !== lastNotifiedIdRef.current) {
      try {
        const n = new Notification(mentioned ? 'You were mentioned' : 'New reply', {
          body: content.slice(0, 140),
        })
        n.onclick = () => {
          window.focus()
          scrollToMessage(latest.id)
        }
        lastNotifiedIdRef.current = latest.id
      } catch {}
    }
  }, [messages, session])

  // Listen for server updates
  useEffect(() => {
    const handleServerUpdate = (event: CustomEvent) => {
      if (event.detail.serverId === serverId) {
        // Refresh server data by refetching
        const refreshServerData = async () => {
          try {
            const response = await fetch(`/api/servers/${serverId}`)
            if (response.ok) {
              const serverData = await response.json()
              setServer(serverData)
            }
          } catch (error) {
            console.error('Error refreshing server data:', error)
          }
        }
        refreshServerData()
      }
    }

    window.addEventListener('serverUpdated', handleServerUpdate as EventListener)
    
    return () => {
      window.removeEventListener('serverUpdated', handleServerUpdate as EventListener)
    }
  }, [serverId])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.show) {
        closeContextMenu()
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenu.show])

  // Close emoji/gif pickers and mention suggestions on outside click
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      // Emoji picker
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(target)) {
        setShowEmojiPicker(false)
      }
      // GIF picker
      if (showGifPicker && gifPickerRef.current && !gifPickerRef.current.contains(target)) {
        setShowGifPicker(false)
      }
      // Mention suggestions
      if (showMentionSuggestions && mentionBoxRef.current && !mentionBoxRef.current.contains(target)) {
        setShowMentionSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [showEmojiPicker, showGifPicker, showMentionSuggestions])

  // Build in-app notifications (last 15 minutes) on new messages
  useEffect(() => {
    if (!messages || !messages.length) return
    const me = (session?.user as any)
    if (!me) return
    const fifteenMin = 15 * 60 * 1000
    const now = Date.now()

    const recentPings: PingNotification[] = []
    for (const m of messages) {
      const ts = new Date((m as any).timestamp || (m as any).createdAt || now).getTime()
      if (now - ts > fifteenMin) continue
      if (m.userId === me.id) continue
      const content = m.content || ''
      const isMention = content.includes(`@${me.username}`)
      const isReply = Boolean(m.replyTo && m.replyTo.user?.id === me.id)
      if (isMention || isReply) {
        recentPings.push({
          id: `${m.id}-${isMention ? 'mention' : 'reply'}`,
          messageId: m.id,
          channelId: m.channelId,
          content: content,
          fromUser: (m as any).user?.username || 'Someone',
          createdAt: ts,
          kind: isMention ? 'mention' : 'reply',
        })
      }
    }
    // Merge unique by id and keep sorted, limited
    setNotifications(prev => {
      const map = new Map<string, PingNotification>()
      ;[...prev, ...recentPings].forEach(p => map.set(p.id, p))
      const list = Array.from(map.values())
        .filter(p => now - p.createdAt <= fifteenMin)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 25)
      return list
    })
  }, [messages, session])

  // Smooth scroll to message and highlight
  const scrollToMessage = (id: string) => {
    try {
      const el = document.querySelector(`[data-message-id="${id}"]`) as HTMLElement | null
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setSelectedMessageId(id)
        setTimeout(() => setSelectedMessageId(s => (s === id ? null : s)), 3000)
      }
    } catch {}
  }

  // Close context menu on click elsewhere
  useEffect(() => {
    const closeMenu = () => setContextMenuState(s => ({ ...s, show: false, message: null }));
    if (contextMenuState.show) {
      window.addEventListener('click', closeMenu);
      return () => window.removeEventListener('click', closeMenu);
    }
  }, [contextMenuState.show]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    if (canSend === false) return

    try {
      const response = await fetch(`/api/channels/${selectedChannel}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          userId: (session?.user as any)?.id,
          mentions: extractMentions(newMessage),
          replyToId: replyingTo?.id || null
        })
      })

      if (response.ok) {
        setNewMessage('')
        setReplyingTo(null)
        setReplyContent('')
        // Refresh messages
        const messagesResponse = await fetch(`/api/channels/${selectedChannel}/messages`)
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          setMessages(messagesData)
        }
      } else if (response.status === 403) {
        setCanSend(false)
        console.warn('Blocked: no permission to send in this channel')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1])
    }
    return mentions
  }

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) return

    try {
      const response = await fetch(`/api/servers/${serverId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryName,
          emoji: categoryEmoji
        })
      })

      if (response.ok) {
        const newCategory = await response.json()
        setCategories(prev => [...prev, newCategory])
        setCategoryName('')
        setCategoryEmoji('')
        setShowCreateCategory(false)
      }
    } catch (error) {
      console.error('Error creating category:', error)
    }
  }

  const handleCreateChannel = async () => {
    if (!channelName.trim() || !selectedCategory) return

    try {
      const response = await fetch(`/api/servers/${serverId}/categories/${selectedCategory}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: channelName,
          type: channelType
        })
      })

      if (response.ok) {
        const newChannel = await response.json()
        setCategories(prev => prev.map(cat => 
          cat.id === selectedCategory 
            ? { ...cat, channels: [...cat.channels, newChannel] }
            : cat
        ))
        setChannelName('')
        setSelectedCategory('')
        setShowCreateChannel(false)
      }
    } catch (error) {
      console.error('Error creating channel:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const file = files[0]
    const maxSize = 200 * 1024 * 1024 // 200MB

    if (file.size > maxSize) {
      alert('File size exceeds 200MB limit')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const { url } = await response.json()
        // Send message with attachment
        const messageResponse = await fetch(`/api/channels/${selectedChannel}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: `📎 ${file.name}`,
            userId: (session?.user as any)?.id,
            attachments: [url]
          })
        })

        if (messageResponse.ok) {
          // Refresh messages
          const messagesResponse = await fetch(`/api/channels/${selectedChannel}/messages`)
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json()
            setMessages(messagesData)
          }
        } else if (messageResponse.status === 403) {
          setCanSendGifs(false)
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }



  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, type: 'category' })
  }

  const handleMentionUser = (username: string) => {
    setNewMessage(prev => prev + `@${username} `)
    closeContextMenu()
  }

  const openUserProfile = async (user: Member, context: 'chat' | 'sidebar' | 'landscape' = 'chat') => {
    setSelectedUser(user)
    setProfileLoading(true)
    setProfileError('')
    try {
      const response = await fetch(`/api/users/${user.id}/profile`)
      if (response.ok) {
        const profile = await response.json()
        setUserProfileData({
          displayName: profile.displayName || user.name || user.username,
          status: profile.status || user.status,
          avatar: profile.avatar || user.avatar || '',
          banner: profile.banner || '',
          description: profile.description || '',
          bannerColor: profile.bannerColor || 'from-purple-500 to-blue-500',
          avatarDecoration: profile.avatarDecoration || null,
          createdAt: (profile.createdAt ? String(profile.createdAt) : '')
        })
      } else {
        setProfileError('Failed to load profile. Showing basic info.')
        setUserProfileData({
          displayName: user.name || user.username,
          status: user.status,
          avatar: user.avatar || '',
          banner: '',
          description: '',
          bannerColor: 'from-purple-500 to-blue-500',
          avatarDecoration: null,
          createdAt: ''
        })
      }
    } catch (error) {
      setProfileError('Error loading profile. Showing basic info.')
      setUserProfileData({
        displayName: user.name || user.username,
        status: user.status,
        avatar: user.avatar || '',
        banner: '',
        description: '',
        bannerColor: 'from-purple-500 to-blue-500',
        avatarDecoration: null,
        createdAt: ''
      })
    }
    setProfileLoading(false)
    setShowUserProfile(true)
    setProfileContext(context)
    closeContextMenu()
  }

  const handleProfileSave = async () => {
    if (!selectedUser || !session?.user) return

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: userProfileData.displayName,
          status: userProfileData.status,
          description: userProfileData.description,
          avatar: userProfileData.avatar,
          banner: userProfileData.banner,
        }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        // Update the user in the members list
        setMembers(prev => prev.map(member => 
          member.id === selectedUser.id 
            ? { ...member, name: updatedUser.displayName, status: updatedUser.status, avatar: updatedUser.avatar }
            : member
        ))
        setShowUserProfile(false)
      } else {
        console.error('Failed to update profile')
      }
    } catch (error) {
      console.error('Profile update error:', error)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const { url } = await response.json()
        setUserProfileData(prev => ({ ...prev, avatar: url }))
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
    }
  }

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const { url } = await response.json()
        setUserProfileData(prev => ({ ...prev, banner: url }))
      }
    } catch (error) {
      console.error('Banner upload error:', error)
    }
  }

  const markMessageAsViewed = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: (session?.user as any)?.id
        })
      })
    } catch (error) {
      console.error('Error marking message as viewed:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewMessage(value)
    
    // Handle @ mentions
    const cursorPos = e.target.selectionStart || 0
    setCursorPosition(cursorPos)
    
    const beforeCursor = value.substring(0, cursorPos)
    const mentionMatch = beforeCursor.match(/@(\w*)$/)
    
    if (mentionMatch) {
      const query = mentionMatch[1]
      setMentionQuery(query)
      setMentionPosition(cursorPos - query.length - 1)
      
      // Filter members based on query
      const filtered = members.filter(member => 
        member.username.toLowerCase().includes(query.toLowerCase())
      )
      setMentionSuggestions(filtered)
      setShowMentionSuggestions(true)
    } else {
      setShowMentionSuggestions(false)
    }
  }

  const handleMentionSelect = (member: Member) => {
    const beforeMention = newMessage.substring(0, mentionPosition)
    const afterMention = newMessage.substring(cursorPosition)
    const newValue = beforeMention + `@${member.username} ` + afterMention
    setNewMessage(newValue)
    setShowMentionSuggestions(false)
    
    // Focus back to input
    setTimeout(() => {
      const input = document.querySelector('input[placeholder*="Message"]') as HTMLInputElement
      if (input) {
        input.focus()
        const newCursorPos = mentionPosition + member.username.length + 2
        input.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // New handler functions for sidebar and channel features
  const handleSidebarResize = (width: number) => {
    setSidebarWidth(width)
  }

  const handleChannelClick = (channel: any) => {
    if (channel.type === 'voice') {
      // Directly select the voice channel to render the in-app VoiceChannel UI
      setSelectedChannel(channel.id)
      setShowVoiceChannelModal(false)
      setSelectedChannelForCustomization(null)
    } else {
      setSelectedChannel(channel.id)
    }
  }

  const handleChannelCustomization = async (channelId: string, customization: any) => {
    try {
      const response = await fetch(`/api/channels/${channelId}/customize`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customization),
      })

      if (response.ok) {
        // Refresh categories to get updated channel data
        const categoriesResponse = await fetch(`/api/servers/${serverId}/categories`)
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData)
        }
      } else {
        console.error('Failed to update channel customization')
      }
    } catch (error) {
      console.error('Error updating channel customization:', error)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, type: 'category' | 'channel' | 'member' | 'message' | 'user', data?: any) => {
    e.preventDefault()
    
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type,
      data
    })
  }

  const handleDeleteServer = async () => {
    if (!confirm('Are you sure you want to delete this server? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/servers/${serverId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/dash')
      } else {
        console.error('Failed to delete server')
      }
    } catch (error) {
      console.error('Error deleting server:', error)
    }
  }

  const handleLeaveServer = async () => {
    if (!confirm('Are you sure you want to leave this server?')) {
      return
    }

    try {
      const response = await fetch(`/api/servers/${serverId}/leave`, {
        method: 'POST'
      })

      if (response.ok) {
        router.push('/dash')
      } else {
        console.error('Failed to leave server')
      }
    } catch (error) {
      console.error('Error leaving server:', error)
    }
  }

  // Context menu handler
  const handleMessageContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    setSelectedMessageId(message.id);
    setContextMenuState({ x: e.clientX, y: e.clientY, show: true, message });
  };

  // Delete message handler
  const handleDeleteMessage = async (message: Message) => {
    setDeletingMessageId(message.id)
    try {
      const res = await fetch(`/api/channels/${message.channelId}/messages`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: message.id })
      })
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== message.id))
        setContextMenuState(s => ({ ...s, show: false, message: null }))
        setSelectedMessageId(null)
      } else {
        // Optionally show error
        alert('Failed to delete message')
      }
    } catch (e) {
      alert('Failed to delete message')
    } finally {
      setDeletingMessageId(null)
    }
  }

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id)
    setEditContent(message.content)
    setContextMenuState(s => ({ ...s, show: false, message: null }))
  }

  const handleEditSubmit = async (message: Message) => {
    setEditLoading(true)
    try {
      const res = await fetch(`/api/channels/${message.channelId}/messages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: message.id, newContent: editContent })
      })
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, content: editContent } : m))
        setEditingMessageId(null)
        setEditContent('')
      } else {
        alert('Failed to edit message')
      }
    } catch (e) {
      alert('Failed to edit message')
    } finally {
      setEditLoading(false)
    }
  }

  const handleReply = (message: Message) => {
    setReplyingTo(message)
    setReplyContent('')
  }

  const cancelReply = () => {
    setReplyingTo(null)
    setReplyContent('')
  }

  const handleForward = (message: Message) => {
    setForwardingMessage(message)
    setShowForwardModal(true)
  }

  const cancelForward = () => {
    setForwardingMessage(null)
    setShowForwardModal(false)
    setForwardTargetChannel('')
  }

  const executeForward = async () => {
    if (!forwardingMessage || !forwardTargetChannel) return

    try {
      const response = await fetch(`/api/messages/${forwardingMessage.id}/forward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetChannelId: forwardTargetChannel,
          userId: (session?.user as any)?.id,
        }),
      })

      if (response.ok) {
        cancelForward()
        // Optionally refresh messages if we're in the target channel
        if (selectedChannel === forwardTargetChannel) {
          const messagesResponse = await fetch(`/api/channels/${selectedChannel}/messages`)
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json()
            setMessages(messagesData)
          }
        }
      }
    } catch (error) {
      console.error('Error forwarding message:', error)
    }
  }

  const handleReadReceipts = async (message: Message) => {
    setReadReceiptsLoading(true)
    setShowReadReceipts(true)
    
    try {
      const response = await fetch(`/api/messages/${message.id}/receipts`)
      if (response.ok) {
        const data = await response.json()
        setReadReceiptsData(data)
      } else {
        console.error('Failed to fetch read receipts')
      }
    } catch (error) {
      console.error('Error fetching read receipts:', error)
    } finally {
      setReadReceiptsLoading(false)
    }
  }

  const closeReadReceipts = () => {
    setShowReadReceipts(false)
    setReadReceiptsData(null)
  }



  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl font-semibold">Loading server...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const isOwner = server?.ownerId === (session?.user as any)?.id
  const isAdmin = members.find(m => m.id === (session?.user as any)?.id)?.role === 'admin'
  const currentChannel = (Array.isArray(categories)
    ? categories.flatMap(cat => Array.isArray(cat?.channels) ? cat.channels : [])
    : []
  ).find(ch => ch?.id === selectedChannel)

  // Helper to group messages by day
  const groupMessagesByDay = (messages: Message[]) => {
    if (!Array.isArray(messages)) {
      return [];
    }
    
    const groups: { date: Date; label: string; messages: Message[] }[] = [];
    let lastDate: Date | null = null;
    messages.forEach(msg => {
      const msgDate = new Date(msg.timestamp);
      if (!lastDate || !isSameDay(msgDate, lastDate)) {
        groups.push({
          date: msgDate,
          label: isToday(msgDate) ? 'Today' : format(msgDate, 'MMMM d, yyyy'),
          messages: [msg],
        });
        lastDate = msgDate;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    return groups;
  };

  // Helper to group messages by user and time (Discord-style)
  const groupMessagesByUser = (messages: Message[]) => {
    if (!Array.isArray(messages)) {
      return [];
    }
    
    const groups: { 
      userId: string; 
      username: string; 
      avatar?: string; 
      messages: Message[]; 
      timestamp: Date;
      isGrouped: boolean;
    }[] = [];
    
    messages.forEach(msg => {
      const msgDate = new Date(msg.timestamp);
      const lastGroup = groups[groups.length - 1];
      
      // Check if we can group with the previous message
      if (lastGroup && 
          lastGroup.userId === msg.userId && 
          Math.abs(msgDate.getTime() - lastGroup.timestamp.getTime()) < 60000) { // 1 minute
        // Add to existing group
        lastGroup.messages.push(msg);
        // Only mark as grouped if there are multiple messages
        lastGroup.isGrouped = lastGroup.messages.length > 1;
      } else {
        // Create new group
        const user = members.find(m => m.id === msg.userId);
        // Fallback to message user info if members array is empty
        const username = user?.username || user?.name || `User ${msg.userId.slice(-4)}`;
        const avatar = user?.avatar || undefined;
        
        groups.push({
          userId: msg.userId,
          username: username,
          avatar: avatar,
          messages: [msg],
          timestamp: msgDate,
          isGrouped: false,
        });
      }
    });
    
    return groups;
  };



  return (
    <div className={`h-screen bg-gradient-to-br ${appearance.gradient} flex relative overflow-hidden ${uiScaleClass} text-[13px] sm:text-[14px] lg:text-[15px] antialiased`} style={{ fontSize: `${fontScale}%` }}>
      {/* Animated Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Chat background image */}
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{
            backgroundImage: chatBgUrl ? `url(${chatBgUrl})` : undefined,
            opacity: chatBgOpacity / 100,
            filter: blur ? `blur(${blur}px)` : undefined,
          }}
        />
        {/* Gradient overlay */}
        {!useCustomGradient ? (
          <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${themeOverlayClass}`}></div>
        ) : (
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{ backgroundImage: `linear-gradient(135deg, ${fromColor}, ${viaColor}, ${toColor})` }}
          />
        )}
        {/* Vignette overlay */}
        {vignette > 0 && (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,${vignette/100}) 100%)` }}
          />
        )}
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Left Sidebar (desktop + mobile drawer) */}
      <div 
        className={`${sidebarBgClass} backdrop-blur-xl border-r border-white/20 flex flex-col min-w-0 overflow-y-auto 
        md:relative md:z-10 md:translate-x-0 md:flex 
        ${isMobile ? `fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] transform transition-transform duration-200 ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}` : 'hidden md:flex'}`}
        style={{ 
          width: `${sidebarWidth}px`,
          minWidth: '200px',
          maxWidth: '100vw'
        }}
      >
        <ResizeHandle onResize={handleSidebarResize} />
        
        {/* Server List Toolbar */}
        <div className="h-16 bg-black/60 backdrop-blur-xl border-b border-white/20 flex items-center px-4 relative overflow-hidden">
          {/* Debug Info */}
          {process.env.NEXT_PUBLIC_DEBUG_SERVER === 'true' && (
            <div className="absolute top-0 right-0 bg-red-500 text-white text-xs p-1 z-50 max-w-xs overflow-hidden">
              <div>Icon: {server?.icon ? 'Yes' : 'No'}</div>
              <div>Banner: {bannerUrl ? 'Yes' : 'No'}</div>
              {server?.icon && <div className="truncate">Icon URL: {server.icon}</div>}
              {bannerUrl && <div className="truncate">Banner URL: {bannerUrl}</div>}
              <button 
                onClick={() => {
                  console.log('Manual server data check:', server)
                  fetchServer()
                }}
                className="mt-1 px-2 py-1 bg-blue-600 text-white text-xs rounded"
              >
                Refresh Data
              </button>
            </div>
          )}
          
          {/* Server Banner Background */}
          {bannerUrl && (
            <div className="absolute inset-0 z-0">
              <img 
                src={bannerUrl} 
                alt="Server Banner" 
                className="w-full h-full object-cover opacity-15"
                onError={() => console.error('Banner image failed to load:', bannerUrl)}
              />
              <div className="absolute inset-0 bg-black/70"></div>
            </div>
          )}
          
          <div className="flex items-center space-x-3 flex-1 min-w-0 relative z-10">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center overflow-hidden shadow-lg border border-white/20 flex-shrink-0">
              {server?.icon ? (
                <img 
                  src={server.icon} 
                  alt={server?.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Icon image failed to load:', server.icon)
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                  onLoad={(e) => {
                    console.log('Icon image loaded successfully:', server.icon)
                    e.currentTarget.nextElementSibling?.classList.add('hidden')
                  }}
                />
              ) : null}
              <span className={`text-white font-bold text-sm ${server?.icon ? 'hidden' : ''}`}>
                {server?.name?.substring(0, 2).toUpperCase() || 'SV'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold text-sm truncate">
                {server?.name || 'Server Name'}
              </h2>
              <p className="text-gray-400 text-xs truncate">
                {server?.description || 'Server description'}
              </p>
            </div>
          </div>
          {/* Mobile close sidebar button */}
          <button
            className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition z-10"
            onClick={() => setShowMobileSidebar(false)}
            aria-label="Close channels sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Server Header */}
        <div className="h-12 sm:h-16 bg-black/60 backdrop-blur-xl border-b border-white/20 flex items-center px-2 sm:px-4 relative overflow-hidden">
          {/* Server Banner Background */}
          {bannerUrl && (
            <div className="absolute inset-0 z-0">
              <img 
                src={bannerUrl} 
                alt="Server Banner" 
                className="w-full h-full object-cover opacity-20"
                onError={() => console.error('Header banner image failed to load:', bannerUrl)}
              />
              <div className="absolute inset-0 bg-black/60"></div>
            </div>
          )}
          
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 relative z-10">
            {/* Mobile: open left drawer */}
            <button 
              onClick={() => setShowMobileSidebar(true)}
              className="md:hidden p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button 
              onClick={() => router.push('/dash')}
              className="p-1 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center overflow-hidden shadow-lg border border-white/20 flex-shrink-0">
              {server?.icon ? (
                <img 
                  src={server.icon} 
                  alt={server?.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => console.error('Header icon image failed to load:', server.icon)}
                />
              ) : (
                <span className="text-white font-bold text-sm sm:text-lg">
                  {server?.name?.substring(0, 2).toUpperCase() || 'SV'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-sm sm:text-lg truncate">
                {server?.name || 'Server Name'}
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0 relative z-10">
            <button
              onClick={() => setShowNotifications(v => !v)}
              className="p-1 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 relative"
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-purple-500 rounded-full animate-pulse" />
              )}
            </button>
            {/* Toggle Members Sidebar */}
            <button
              onClick={() => setShowMembers(v => !v)}
              className={`p-1 sm:p-2 rounded-lg transition-all duration-200 ${showMembers ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              title={showMembers ? 'Hide Members' : 'Show Members'}
              aria-label={showMembers ? 'Hide Members' : 'Show Members'}
            >
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button 
              className="p-1 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              onClick={() => setShowServerMenu(!showServerMenu)}
            >
              <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      

      {/* Server Menu Dropdown */}
      {showServerMenu && (
        <div className="absolute top-16 left-4 w-72 bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 z-50">
          <div className="p-3">
            {/* Server Info */}
            <div className="p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg mb-3 border border-white/10 relative overflow-hidden">
              {/* Server Banner Background */}
              {bannerUrl && (
                <div className="absolute inset-0 z-0">
                  <img 
                    src={bannerUrl} 
                    alt="Server Banner" 
                    className="w-full h-full object-cover opacity-10"
                    onError={() => console.error('Menu banner image failed to load:', bannerUrl)}
                  />
                  <div className="absolute inset-0 bg-black/40"></div>
                </div>
              )}
              
              <div className="flex items-center space-x-3 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center border border-white/20 overflow-hidden">
                  {server?.icon ? (
                    <img 
                      src={server.icon} 
                      alt={server?.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => console.error('Menu icon image failed to load:', server.icon)}
                    />
                  ) : (
                    <span className="text-white font-bold text-lg">
                      {server?.name?.charAt(0) || 'S'}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{server?.name}</h3>
                  <p className="text-gray-400 text-sm">{members.length} members</p>
                </div>
              </div>

              {/* Server Actions */}
              <div className="space-y-1">
                <button 
                  className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 text-sm"
                  onClick={() => {
                    setInviteUrl(null)
                    setInviteCopied(false)
                    setShowInviteModal(true)
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Invite People</span>
                </button>
                <button 
                  className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 text-sm"
                  onClick={handleCopyServerId}
                >
                  <Copy className="h-4 w-4" />
                  <span>{serverIdCopied ? 'Server ID Copied!' : 'Copy Server ID'}</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 text-sm">
                  <Eye className="h-4 w-4" />
                  <span>Show All Channels</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 text-sm">
                  <Zap className="h-4 w-4" />
                  <span>Server Boost</span>
                </button>
              </div>

              {/* Admin/Owner Actions */}
              {(isOwner || isAdmin) && (
                <>
                  <div className="border-t border-white/10 my-3"></div>
                  <div className="space-y-1">
                    <button 
                      className="w-full flex items-center space-x-3 px-3 py-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200 text-sm"
                      onClick={() => router.push(`/server/${serverId}/settings`)}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Server Settings</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200 text-sm" onClick={() => openRolePerms()}>
                      <Users2 className="h-4 w-4" />
                      <span>Roles Management</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200 text-sm">
                      <Shield className="h-4 w-4" />
                      <span>Privacy Settings</span>
                    </button>
                  </div>
                </>
              )}

              {/* Owner Only Actions */}
              {isOwner && (
                <>
                  <div className="border-t border-white/10 my-3"></div>
                  <div className="space-y-1">
                    <button className="w-full flex items-center space-x-3 px-3 py-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-all duration-200 text-sm">
                      <Crown className="h-4 w-4" />
                      <span>Transfer Ownership</span>
                    </button>
                    <button 
                      className="w-full flex items-center space-x-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 text-sm"
                      onClick={handleDeleteServer}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Server</span>
                    </button>
                  </div>
                </>
              )}

              {/* Leave Server (for non-owners) */}
              {!isOwner && (
                <>
                  <div className="border-t border-white/10 my-3"></div>
                  <button 
                    className="w-full flex items-center space-x-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 text-sm"
                    onClick={handleLeaveServer}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Leave Server</span>
                  </button>
                </>
              )}
            </div>
          </div>
          </div>
        )}

        {/* Channels */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 space-y-3 sm:space-y-4">
            {categories && categories.length > 0 ? categories.map((category) => (
              <div key={category.id}>
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    onContextMenu={(e) => handleContextMenu(e, 'category', category)}
                    className="flex items-center space-x-1 sm:space-x-2 text-gray-400 hover:text-white transition-colors min-w-0 flex-1"
                  >
                    {expandedCategories.includes(category.id) ? (
                      <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    )}
                    <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider truncate">
                      {category.emoji} {category.name}
                    </h2>
                  </button>
                  {(isOwner || isAdmin) && (
                    <button 
                      className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded transition-all duration-200 flex-shrink-0"
                      onClick={() => {
                        setSelectedCategory(category.id)
                        setShowCreateChannel(true)
                      }}
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  )}
                </div>
                
                {expandedCategories.includes(category.id) && (
                  <div className="space-y-1 ml-2 sm:ml-4">
                    {category.channels && category.channels.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => handleChannelClick(channel)}
                        onContextMenu={(e) => handleContextMenu(e, 'channel', channel)}
                        className={`w-full flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-all duration-200 ${
                          selectedChannel === channel.id 
                            ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30' 
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                        style={{
                          backgroundImage: channel.backgroundUrl ? `url(${channel.backgroundUrl})` : 'none',
                          backgroundColor: channel.backgroundColor || 'transparent',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        {channel.type === 'voice' ? (
                          <Mic className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        ) : (
                          <Hash className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        )}
                        <span className="flex-1 text-left truncate">{channel.name}</span>
                        {channel.type === 'voice' && (voicePeers[channel.id]?.length ?? 0) > 0 && (
                          <div className="hidden sm:flex items-center -space-x-1 mr-1">
                            {voicePeers[channel.id].slice(0,3).map((p: any) => (
                              p?.avatar ? (
                                <div key={p.socketId} className="w-4 h-4">
                                  <Avatar src={p.avatar} size={16} alt="peer" />
                                </div>
                              ) : (
                                <div key={p.socketId} className="w-4 h-4 rounded-full bg-white/10 border border-black/40" />
                              )
                            ))}
                            {voicePeers[channel.id].length > 3 && (
                              <span className="text-[10px] text-gray-300 pl-1">+{voicePeers[channel.id].length - 3}</span>
                            )}
                          </div>
                        )}
                        {channel.type === 'voice' && (voicePresence[channel.id] ?? 0) > 0 && (
                          <span className="bg-green-600 text-white text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-0.5 rounded-full flex-shrink-0">
                            {voicePresence[channel.id]}
                          </span>
                        )}
                        {channel.unread > 0 && (
                          <span className="bg-red-500 text-white text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0">
                            {channel.unread}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )) : (
              <div className="text-gray-400 text-center py-8">
                <p>No categories found</p>
                <p className="text-sm">Create a category to get started</p>
              </div>
            )}

            {/* Create Category Button (Admin/Owner only) */}
            {(isOwner || isAdmin) && (
              <button
                onClick={() => setShowCreateCategory(true)}
                className="w-full flex items-center space-x-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Create Category</span>
              </button>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="h-12 sm:h-16 bg-black/60 backdrop-blur-xl border-t border-white/20 flex items-center px-2 sm:px-4">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 cursor-pointer hover:bg-white/5 rounded-lg p-1 sm:p-2 transition-all duration-200 min-w-0"
               onClick={() => {
                 if (session?.user) {
                   const currentUser: Member = {
                     id: (session.user as any).id || '',
                     name: (session.user as any).name || '',
                     avatar: (session.user as any).avatar || null,
                     status: 'online',
                     role: 'member',
                     username: (session.user as any).username || '',
                     joinedAt: new Date(),
                     isAdmin: (session.user as any).isAdmin || false
                   }
                   openUserProfile(currentUser, 'sidebar')
                 }
               }}>
            <div className="flex-shrink-0">
              <Avatar
                src={(session?.user as any)?.avatar || ''}
                alt="Avatar"
                size={44}
                decorationSlug={(session?.user as any)?.avatarDecoration || null}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium text-xs sm:text-sm truncate">
                {(session?.user as any)?.username}
              </div>
              <div className="text-gray-400 text-xs">Online</div>
            </div>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
            <button className="p-1 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
              <Mic className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <button className="p-1 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
              <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <button className="p-1 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Channel Header */}
        <div className="h-12 sm:h-16 bg-black/40 backdrop-blur-xl border-b border-white/20 flex items-center px-3 sm:px-6">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            {/* Mobile menu to open left sidebar */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition"
              onClick={() => setShowMobileSidebar(true)}
              aria-label="Open channels sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Hash className="h-4 w-4 sm:h-6 sm:w-6 text-gray-400 flex-shrink-0" />
            <h2 className="text-white font-bold text-sm sm:text-xl truncate">
              {currentChannel?.name || 'general'}
            </h2>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0">
            <div className="relative">
              <button
                className="p-1 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 relative"
                onClick={() => setShowNotifications(v => !v)}
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-purple-500 rounded-full animate-pulse" />
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-white/10 text-white/80 text-sm">Recent pings</div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-gray-400 text-sm">No recent mentions or replies</div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            setShowNotifications(false)
                            // If ping is from another channel, attempt to switch first
                            if (n.channelId && n.channelId !== selectedChannel) {
                              const ch = categories.flatMap(c => c.channels || []).find(c => c.id === n.channelId)
                              if (ch) handleChannelClick(ch as any)
                              // defer scroll to allow messages to render
                              setTimeout(() => scrollToMessage(n.messageId), 450)
                            } else {
                              scrollToMessage(n.messageId)
                            }
                          }}
                          className="w-full text-left px-3 py-3 hover:bg-white/10 transition-colors flex items-start space-x-3"
                        >
                          <div className={`mt-1 h-2 w-2 rounded-full ${n.kind === 'mention' ? 'bg-purple-400' : 'bg-blue-400'}`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white/90 text-sm truncate">
                              {n.kind === 'mention' ? 'Mention from ' : 'Reply from '}
                              <span className="text-purple-300 font-medium">{n.fromUser}</span>
                            </div>
                            <div className="text-gray-400 text-xs truncate">{n.content}</div>
                            <div className="text-gray-500 text-[11px] mt-1">
                              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="p-1 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Messages / Voice Area */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 bg-transparent flex flex-col min-h-0 relative">
            {currentChannel?.type === 'voice' ? (
              <div className="h-full">
                <VoiceChannel
                  serverId={serverId}
                  channelId={currentChannel.id}
                  me={{
                    id: (session?.user as any)?.id,
                    displayName: (session?.user as any)?.username || (session?.user as any)?.name || 'Me',
                    username: (session?.user as any)?.username || (session?.user as any)?.name || 'Me',
                    avatar: (session?.user as any)?.image || undefined,
                  }}
                />
              </div>
            ) : (
            <>
            {/* Messages */}
            <div
              ref={messagesListRef}
              onScroll={handleMessagesScroll}
              className="flex-1 overflow-y-auto overscroll-contain px-2 sm:px-3 md:px-4 py-3 sm:py-4 scroll-smooth break-words"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {messagesLoading ? (
                <div className="w-full h-full min-h-[40vh] flex items-center justify-center">
                  <AuroraLoader size={140} />
                </div>
              ) : (
                messages.length === 0 ? (
                  <div className="w-full h-full min-h-[40vh] flex flex-col items-center justify-center text-center text-gray-300">
                    <div className="text-3xl font-bold text-white mb-2">#{currentChannel?.name || 'channel'}</div>
                    {canSend === false ? (
                      <div className="text-gray-400">You cannot chat in this channel.</div>
                    ) : (
                      <button
                        onClick={() => messageInputRef.current?.focus()}
                        className="mt-2 px-4 py-2 rounded bg-white/10 hover:bg-white/15 border border-white/20 text-white"
                      >
                        Chat here
                      </button>
                    )}
                  </div>
                ) : (
                <div className="space-y-10">
                  {groupMessagesByDay(messages).map((group, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-center mb-6">
                        <div className="border-t border-gray-700 flex-1" />
                        <span className="mx-4 text-gray-400 text-xs uppercase tracking-wider">{group.label}</span>
                        <div className="border-t border-gray-700 flex-1" />
                      </div>
                      <div className="space-y-6">
                        {groupMessagesByUser(group.messages).map((messageGroup, groupIndex) => (
                          <div
                            key={`${messageGroup.userId}-${groupIndex}`}
                            className={`flex items-start space-x-4 group relative`}
                          >
                            {/* Avatar - only show for first message in group */}
                            <div
                              className={`flex-shrink-0 cursor-pointer hover:scale-105 transition-transform`}
                              onClick={() => {
                                const m = members.find(m => m.id === messageGroup.userId)
                                if (m) openUserProfile(m, 'chat')
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                const m = members.find(m => m.id === messageGroup.userId)
                                handleContextMenu(e as any, 'user', m || { id: messageGroup.userId, username: messageGroup.username })
                              }}
                            >
                              <Avatar src={messageGroup.avatar} alt="Avatar" size={56} />
                            </div>
                            
                            <div className="flex-1">
                              {/* Messages in group */}
                              <div className="space-y-1">
                                {messageGroup.messages.map((message, msgIndex) => (
                                  <div
                                    key={message.id}
                                    data-message-id={message.id}
                                    className={`relative message-content ${selectedMessageId === message.id ? 'ring-2 ring-purple-400/60 shadow-[0_0_0_3px_rgba(168,85,247,0.25)] bg-purple-900/10 rounded-lg transition-shadow' : ''}`}
                                    onContextMenu={e => handleMessageContextMenu(e, message)}
                                    onClick={() => setSelectedMessageId(null)}
                                    onTouchStart={(e) => {
                                      const t = e.touches[0]
                                      ;(e.currentTarget as any)._touchStartX = t.clientX
                                      ;(e.currentTarget as any)._touchStartY = t.clientY
                                      ;(e.currentTarget as any)._swiped = false
                                    }}
                                    onTouchMove={(e) => {
                                      const t = e.touches[0]
                                      const startX = (e.currentTarget as any)._touchStartX || 0
                                      const startY = (e.currentTarget as any)._touchStartY || 0
                                      const dx = t.clientX - startX
                                      const dy = Math.abs(t.clientY - startY)
                                      if (!(e.currentTarget as any)._swiped && dx > 64 && dy < 32) {
                                        ;(e.currentTarget as any)._swiped = true
                                        // Trigger reply on right-swipe
                                        try { handleReply(message) } catch {}
                                        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                                          try { (navigator as any).vibrate?.(10) } catch {}
                                        }
                                      }
                                    }}
                                  >
                                    {/* Hover quick actions */}
                                    <div className="absolute right-0 -top-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center space-x-1">
                                      <button
                                        className="px-2 py-1 rounded bg-black/60 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-xs"
                                        onClick={(e) => { e.stopPropagation(); handleReply(message) }}
                                        title="Reply"
                                      >
                                        <Reply className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        className="px-2 py-1 rounded bg-black/60 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-xs"
                                        onClick={(e) => { e.stopPropagation(); setReactionPickerFor(message.id) }}
                                        title="React"
                                      >
                                        <SmilePlus className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        className="px-2 py-1 rounded bg-black/60 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-xs"
                                        onClick={(e) => { e.stopPropagation(); setContextMenuState({ x: (e as any).clientX || 0, y: (e as any).clientY || 0, show: true, message }) }}
                                        title="More"
                                      >
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                    {/* Username and timestamp - only show for first message in group */}
                                    {msgIndex === 0 && (
                                      <div className="flex items-center space-x-3 mb-1">
                                        <span
                                          className="text-white font-bold text-lg cursor-pointer hover:text-purple-400 transition-colors"
                                          onClick={() => {
                                            const m = members.find(m => m.id === messageGroup.userId)
                                            if (m) openUserProfile(m, 'chat')
                                          }}
                                          onContextMenu={(e) => {
                                            e.preventDefault()
                                            const m = members.find(m => m.id === messageGroup.userId)
                                            handleContextMenu(e as any, 'user', m || { id: messageGroup.userId, username: messageGroup.username })
                                          }}
                                        >
                                          {messageGroup.username}
                                          {/* Server tag badge after username if this is user's chosen badge server */}
                                          {(() => {
                                            const m = members.find(m => m.id === messageGroup.userId)
                                            if (m && (m as any).isBadgeServer && server?.tag) {
                                              return (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/30 align-middle">
                                                  {server.tag}
                                                </span>
                                              )
                                            }
                                            return null
                                          })()}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                          {format(messageGroup.timestamp, 'h:mm a')}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {/* Reply indicator */}
                                    {message.replyTo && (
                                      <div className="mb-2 p-2 bg-gray-800/50 rounded-lg border-l-4 border-purple-500">
                                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                                          <MessageSquare className="h-3 w-3" />
                                          <span>Replying to</span>
                                          <span className="text-purple-400 font-medium">
                                            {members.find(m => m.id === message.replyTo?.userId)?.username || message.replyTo?.user?.username || 'Unknown User'}
                                          </span>
                                        </div>
                                        <div className="text-gray-300 text-sm mt-1 truncate">
                                          {message.replyTo.content}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Message content */}
                                    {editingMessageId === message.id ? (
                                      <form
                                        className="flex flex-col gap-2"
                                        onSubmit={e => { e.preventDefault(); handleEditSubmit(message) }}
                                      >
                                        <input
                                          className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                                          value={editContent}
                                          onChange={e => setEditContent(e.target.value)}
                                          disabled={editLoading}
                                          autoFocus
                                        />
                                        <div className="flex gap-2">
                                          <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded" disabled={editLoading}>
                                            {editLoading ? 'Saving...' : 'Save'}
                                          </button>
                                          <button type="button" className="px-3 py-1 bg-gray-700 text-white rounded" onClick={() => setEditingMessageId(null)} disabled={editLoading}>
                                            Cancel
                                          </button>
                                        </div>
                                      </form>
                                    ) : (
                                      <div className={`${messageGroup.isGrouped && msgIndex > 0 ? 'pl-4 border-l-2 border-gray-700/30' : ''}`}>
                                        <div
                                          className="text-gray-300 text-lg break-words whitespace-pre-wrap max-w-[75ch] w-fit"
                                          dangerouslySetInnerHTML={formatMessageHtml(message.content)}
                                        />
                                        {/* Attachments (images/GIFs) */}
                                        {message.attachments && message.attachments.length > 0 && (
                                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-w-full">
                                            {message.attachments.map((attUrl, idx) => (
                                              <img
                                                key={`${message.id}-att-${idx}`}
                                                src={attUrl}
                                                alt="attachment"
                                                loading="lazy"
                                                className="max-h-64 w-full rounded-lg border border-white/10 object-cover bg-black/40"
                                                style={{ imageRendering: 'auto' }}
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Timestamp for last message in group */}
                                    {messageGroup.isGrouped && msgIndex === messageGroup.messages.length - 1 && (
                                      <div className="text-xs text-gray-400 mt-1">
                                        {format(new Date(message.timestamp), 'h:mm a')}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                <div ref={messagesEndRef} />
              </div>
            ))}
          </div>
          {/* Scroll Controls */}
            {canScrollUp && (
              <button
                onClick={scrollUpPage}
                className="absolute right-6 top-24 sm:top-28 p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-lg backdrop-blur-md"
                aria-label="Scroll up"
              >
                ↑
              </button>
            )}
            {showScrollToBottom && (
              <button
                onClick={scrollToBottom}
                className="absolute right-6 bottom-[110px] sm:bottom-[120px] p-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-xl"
                aria-label="Scroll to bottom"
              >
                ↓
              </button>
            )}

            {/* Message Input */}
            <div className="p-6 border-t border-white/20">
              {/* Reply UI */}
              {replyingTo && (
                <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <MessageSquare className="h-4 w-4" />
                      <span>Replying to</span>
                      <span className="text-purple-400 font-medium">
                        {members.find(m => m.id === replyingTo.userId)?.username || 'Unknown User'}
                      </span>
                    </div>
                    <button
                      onClick={cancelReply}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-gray-300 text-sm mt-1 truncate">
                    {replyingTo.content}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                <button 
                  className={`p-2 sm:p-3 rounded-lg transition-all duration-200 ${canSendGifs === false ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                  onClick={() => { if (canSendGifs === false) return; fileInputRef.current?.click() }}
                  disabled={canSendGifs === false}
                  title={canSendGifs === false ? 'You cannot upload files in this channel' : undefined}
                >
                  <Paperclip className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                 <div className="relative" ref={emojiPickerRef}>
                  <button 
                    className="p-2 sm:p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                   
                   {/* Emoji Picker */}
                   {showEmojiPicker && (
                     <div className="absolute bottom-full right-0 mb-2 z-50">
                       <EmojiPicker
                         onEmojiClick={(emojiObject) => {
                           setNewMessage(prev => prev + emojiObject.emoji)
                           setShowEmojiPicker(false)
                         }}
                         width={350}
                         height={400}
                       />
                     </div>
                   )}
                 </div>
                 
                 {/* GIF Button */}
                 <div className="relative" ref={gifPickerRef}>
                  <button 
                   className={`p-2 sm:p-3 rounded-lg transition-all duration-200 ${canSendGifs === false ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                   onClick={() => { if (canSendGifs === false) return; setShowGifPicker(!showGifPicker) }}
                   disabled={canSendGifs === false}
                   title={canSendGifs === false ? 'You cannot send GIFs/images in this channel' : undefined}
                  >
                    <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                   
                   {/* GIF Picker */}
                   {showGifPicker && (
                     <div className="absolute bottom-full right-0 mb-2 z-50 bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 p-4 w-80">
                       <div className="mb-4">
                         <Input
                           type="text"
                           placeholder="Search GIFs..."
                           value={gifSearchQuery}
                           onChange={(e) => setGifSearchQuery(e.target.value)}
                           onKeyPress={(e) => e.key === 'Enter' && searchGifs(gifSearchQuery)}
                           className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                         />
                         <button
                           onClick={() => searchGifs(gifSearchQuery)}
                           className="mt-2 px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                         >
                           Search
                         </button>
                       </div>
                       <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                         {gifResults.map((gif) => (
                           <img
                             key={gif.id}
                             src={gif.images.fixed_height.url}
                             alt="GIF"
                             className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80"
                             onClick={() => handleGifSelect(gif)}
                           />
                         ))}
                       </div>
                     </div>
                   )}
                 </div>
                 
                {/* Formatting Toolbar removed for a cleaner composer */}

                <div className="flex-1 relative" ref={mentionBoxRef}>
                  <div className="relative flex-1">
                    <Input
                      ref={messageInputRef}
                      type="text"
                      placeholder={canSend === false ? 'You do not have permission to send messages in this channel' : `Message #${currentChannel?.name || 'general'}`}
                      className={`bg-black/40 border-white/20 text-white placeholder:text-gray-400 text-sm sm:text-base md:text-lg py-2.5 sm:py-3.5 pr-10 sm:pr-12 ${canSend === false ? 'opacity-60 cursor-not-allowed' : ''}`}
                      value={newMessage}
                      onChange={handleMessageChange}
                      onKeyPress={handleKeyPress}
                      disabled={canSend === false}
                    />
                    
                    {/* Mention Suggestions */}
                    {showMentionSuggestions && mentionSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-2 w-64 bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 z-50 max-h-48 overflow-y-auto">
                        {mentionSuggestions.map((member) => (
                          <button
                            key={member.id}
                            className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
                            onClick={() => handleMentionSelect(member)}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <Avatar src={member.avatar || undefined} alt="Avatar" size={36} />
                              <div className="flex-1 text-left">
                                <div className="text-white font-medium text-sm">{member.username}</div>
                                <div className="text-gray-400 text-xs capitalize">{member.status}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all duration-200 ${canSend === false ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                    onClick={handleSendMessage}
                    disabled={canSend === false}
                    title={canSend === false ? 'You cannot send messages in this channel' : undefined}
                  >
                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept="*/*"
              />
            </div>
            </>
            )}
          </div>

          {/* Right Sidebar - Server Members (desktop) */}
          {showMembers && (
          <div className="hidden md:block w-80 bg-black/40 backdrop-blur-xl border-l border-white/20">
            <div className="p-6">
              <h3 className="text-white font-bold text-xl mb-4">Members</h3>
              <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
                <span className="h-[1px] w-6 bg-white/20" />
                <span>{sortedMembers.length} members</span>
              </div>

              {/* Members List (enhanced) */}
              <div className="space-y-2">
                {sortedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="group flex items-center gap-3 p-2 rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent hover:from-white/[0.06] hover:border-white/20 transition-colors cursor-pointer"
                    onContextMenu={(e) => handleContextMenu(e, 'member', member)}
                    onClick={() => openUserProfile(member, 'landscape')}
                  >
                    <div className="relative">
                      <Avatar
                        src={member.avatar || undefined}
                        alt={member.username}
                        size={44}
                        decorationSlug={member.avatarDecoration ?? undefined}
                      />
                      <div
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black ${
                          member.status === 'online' ? 'bg-green-500' :
                          member.status === 'idle' ? 'bg-yellow-500' :
                          member.status === 'dnd' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm truncate">{member.username}</span>
                        {member.role === 'owner' && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                        {member.role === 'admin' && <Shield className="h-3.5 w-3.5 text-blue-400" />}
                        <span className={`ml-auto shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border ${
                          member.role === 'owner' ? 'border-yellow-400/30 text-yellow-300 bg-yellow-400/10' :
                          member.role === 'admin' ? 'border-blue-400/30 text-blue-300 bg-blue-400/10' :
                          'border-white/15 text-gray-300 bg-white/5'
                        }`}>{member.role}</span>
                      </div>
                      <div className="text-gray-400 text-xs capitalize">{member.status}</div>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                      onClick={(e) => { e.stopPropagation(); handleContextMenu(e as any, 'member', member) }}
                      title="More"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Mobile members drawer */}
      {isMobile && showMembers && (
        <div className="fixed inset-y-0 right-0 z-40 w-80 max-w-[85vw] bg-black/90 backdrop-blur-xl border-l border-white/20 md:hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-bold">Members</h3>
            <button
              onClick={() => setShowMembers(false)}
              className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
              aria-label="Close members"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto h-full">
            <div className="mb-3 flex items-center gap-2 text-xs text-gray-400">
              <span className="h-[1px] w-6 bg-white/20" />
              <span>{sortedMembers.length} members</span>
            </div>
            <div className="space-y-2 pr-2">
              {sortedMembers.map((member) => (
                <div
                  key={member.id}
                  className="group flex items-center gap-3 p-2 rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent hover:from-white/[0.06] hover:border-white/20 transition-colors cursor-pointer"
                  onContextMenu={(e) => handleContextMenu(e, 'member', member)}
                  onClick={() => openUserProfile(member, 'landscape')}
                >
                  <div className="relative">
                    <Avatar src={member.avatar || undefined} alt={member.username} size={40} decorationSlug={member.avatarDecoration ?? undefined} />
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${member.status === 'online' ? 'bg-green-500' : member.status === 'idle' ? 'bg-yellow-500' : member.status === 'dnd' ? 'bg-red-500' : 'bg-gray-500'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm truncate">{member.username}</span>
                      {member.role === 'owner' && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                      {member.role === 'admin' && <Shield className="h-3.5 w-3.5 text-blue-400" />}
                    </div>
                    <div className="text-gray-400 text-xs capitalize">{member.status}</div>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                    onClick={(e) => { e.stopPropagation(); handleContextMenu(e as any, 'member', member) }}
                    title="More"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile backdrop for drawers */}
      {isMobile && (showMobileSidebar || showMembers) && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => { setShowMobileSidebar(false); setShowMembers(false) }}
        />
      )}

      {/* Create Category Modal */}
      {showCreateCategory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Create Category</h2>
              <button
                onClick={() => setShowCreateCategory(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Category Name *
                </label>
                <Input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Emoji (Optional)
                </label>
                <Input
                  type="text"
                  value={categoryEmoji}
                  onChange={(e) => setCategoryEmoji(e.target.value)}
                  placeholder="🎉"
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowCreateCategory(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateCategory}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                  disabled={!categoryName.trim()}
                >
                  Create Category
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Channel/Category Permissions Modal */}
      {showPermissionsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-6 w-full max-w-3xl border border-white/20 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                {permissionsTarget?.type === 'channel' ? 'Channel' : 'Category'} Permissions
                {permissionsTarget?.name ? <span className="text-gray-400 font-normal"> · {permissionsTarget.name}</span> : null}
              </h2>
              <button onClick={() => setShowPermissionsModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            {permissionsLoading ? (
              <div className="py-12 text-center text-gray-300">Loading permissions...</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-5 text-xs text-gray-400 px-2">
                  <div>Role</div>
                  <div className="text-center">Can View/Read</div>
                  <div className="text-center">Can Send</div>
                  <div className="text-center">Can Send GIFs</div>
                  <div className="text-center">Can React</div>
                </div>
                <div className="divide-y divide-white/10 rounded-lg overflow-hidden border border-white/10">
                  {ensureRoleRows().map((row, idx) => {
                    const title = row.roleId ? (roles.find(r => r.id === row.roleId)?.name || 'Role') : '@everyone'
                    const badge = (v: boolean | null) => (
                      <span className={`inline-block px-2 py-1 rounded text-xs cursor-pointer select-none ${v === true ? 'bg-green-500/20 text-green-300 border border-green-500/30' : v === false ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-gray-700/50 text-gray-300 border border-gray-600'}`}>{v === true ? 'Allow' : v === false ? 'Deny' : 'Inherit'}</span>
                    )
                    return (
                      <div key={`${row.roleId || 'everyone'}-${idx}`} className="grid grid-cols-5 items-center px-3 py-2 bg-black/40">
                        <div className="text-sm text-white">{title}</div>
                        <div className="flex justify-center" onClick={() => togglePerm(idx, 'canRead')}>{badge(row.canRead)}</div>
                        <div className="flex justify-center" onClick={() => togglePerm(idx, 'canSend')}>{badge(row.canSend)}</div>
                        <div className="flex justify-center" onClick={() => togglePerm(idx, 'canSendGifs')}>{badge(row.canSendGifs)}</div>
                        <div className="flex justify-center" onClick={() => togglePerm(idx, 'canReact')}>{badge(row.canReact)}</div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button onClick={() => setShowPermissionsModal(false)} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Cancel</button>
                  <button onClick={savePermissions} disabled={permissionsLoading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {permissionsLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Role Permissions Modal */}
      {showRolePermsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-6 w-full max-w-3xl border border-white/20 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Role Permissions</h2>
              <button onClick={() => setShowRolePermsModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 border border-white/10 rounded-lg overflow-hidden">
                <div className="px-3 py-2 text-xs text-gray-400 bg-white/5">Roles</div>
                <div className="max-h-72 overflow-y-auto">
                  {roles.length === 0 && <div className="p-3 text-sm text-gray-400">No roles created yet</div>}
                  {roles.map(r => (
                    <button
                      key={r.id}
                      onClick={() => { setSelectedRolePermsId(r.id); loadRolePerms(r.id) }}
                      className={`w-full text-left px-3 py-2 text-sm border-b border-white/10 last:border-b-0 ${selectedRolePermsId === r.id ? 'bg-purple-500/20 text-purple-200' : 'text-gray-300 hover:bg-white/10'}`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 border border-white/10 rounded-lg p-4">
                {rolePermsLoading ? (
                  <div className="py-12 text-center text-gray-300">Loading role permissions...</div>
                ) : selectedRolePermsId ? (
                  <div className="space-y-2">
                    {[...DEFAULT_ROLE_PERMS].map(key => (
                      <label key={key} className="flex items-center justify-between px-3 py-2 rounded bg-white/5">
                        <span className="text-sm text-gray-200">{key}</span>
                        <input type="checkbox" className="form-checkbox h-4 w-4" checked={rolePerms.includes(key)} onChange={() => toggleRolePerm(key)} />
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">Select a role to edit permissions.</div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <button onClick={() => setShowRolePermsModal(false)} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Close</button>
                  <button onClick={saveRolePerms} disabled={rolePermsLoading || !selectedRolePermsId} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">{rolePermsLoading ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Create Channel</h2>
              <button
                onClick={() => setShowCreateChannel(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Channel Name *
                </label>
                <Input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="Enter channel name"
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Channel Type *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="text"
                      checked={channelType === 'text'}
                      onChange={(e) => setChannelType(e.target.value as 'text' | 'voice')}
                      className="text-purple-500"
                    />
                    <span className="text-white">Text Channel</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="voice"
                      checked={channelType === 'voice'}
                      onChange={(e) => setChannelType(e.target.value as 'text' | 'voice')}
                      className="text-purple-500"
                    />
                    <span className="text-white">Voice Channel</span>
                  </label>
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowCreateChannel(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateChannel}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                  disabled={!channelName.trim()}
                >
                  Create Channel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite People Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-white/20 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Invite People</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Invite link expires in</label>
                <select
                  className="w-full bg-gray-800/60 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={expiresIn === null ? 'never' : String(expiresIn)}
                  onChange={(e) => {
                    const v = e.target.value
                    setExpiresIn(v === 'never' ? null : Number(v))
                  }}
                >
                  <option value="1800">30 minutes</option>
                  <option value="3600">1 hour</option>
                  <option value="21600">6 hours</option>
                  <option value="43200">12 hours</option>
                  <option value="86400">1 day</option>
                  <option value="604800">7 days</option>
                  <option value="never">Never</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Max uses</label>
                <select
                  className="w-full bg-gray-800/60 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={maxUses === null ? 'unlimited' : String(maxUses)}
                  onChange={(e) => {
                    const v = e.target.value
                    setMaxUses(v === 'unlimited' ? null : Number(v))
                  }}
                >
                  <option value="1">1 use</option>
                  <option value="5">5 uses</option>
                  <option value="10">10 uses</option>
                  <option value="25">25 uses</option>
                  <option value="50">50 uses</option>
                  <option value="100">100 uses</option>
                  <option value="1000">1000 uses</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={generateInvite}
                  disabled={inviteGenerating}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {inviteGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4" />
                      <span>Generate Invite</span>
                    </>
                  )}
                </button>
              </div>

              {inviteUrl && (
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Invite link</label>
                  <div className="flex items-center space-x-2">
                    <input
                      value={inviteUrl}
                      readOnly
                      className="flex-1 bg-gray-800/60 border border-gray-700 text-gray-200 rounded-lg px-3 py-2"
                    />
                    <button
                      onClick={copyInviteLink}
                      className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      {inviteCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
       {contextMenu.show && (
         <div 
           className="fixed bg-black/90 backdrop-blur-xl rounded-lg shadow-2xl border border-white/20 z-50"
           style={{ top: contextMenu.y, left: contextMenu.x }}
         >
           <div className="p-2">
             {contextMenu.type === 'category' && (
               <>
                 <button 
                   className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded text-sm"
                   onClick={() => {
                     router.push(`/server/${serverId}/categories/${contextMenu.data?.id}/edit`)
                     closeContextMenu()
                   }}
                 >
                   <Settings className="h-4 w-4" />
                   <span>Edit Category</span>
                 </button>
                 <button 
                   className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded text-sm"
                   onClick={() => {
                     setSelectedCategory(contextMenu.data?.id || '')
                     setShowCreateChannel(true)
                     closeContextMenu()
                   }}
                 >
                   <Plus className="h-4 w-4" />
                   <span>Create Channel</span>
                 </button>
                 <button 
                   className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded text-sm"
                   onClick={() => {
                     // Edit category
                     closeContextMenu()
                   }}
                 >
                   <Edit3 className="h-4 w-4" />
                   <span>Edit Category</span>
                 </button>
                 {canManageRoles && (
                   <button 
                     className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded text-sm"
                     onClick={() => { openCategoryPermissions(contextMenu.data); closeContextMenu() }}
                   >
                     <Shield className="h-4 w-4" />
                     <span>Permissions</span>
                   </button>
                 )}
                 <button 
                   className="w-full flex items-center space-x-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded text-sm"
                   onClick={() => {
                     deleteCategory(contextMenu.data?.id, contextMenu.data?.name)
                     closeContextMenu()
                   }}
                 >
                   <Trash2 className="h-4 w-4" />
                   <span>Delete Category</span>
                 </button>
               </>
             )}
             
             {contextMenu.type === 'channel' && (
               <>
                 <button 
                   className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded text-sm"
                   onClick={() => {
                     router.push(`/server/${serverId}/channels/${contextMenu.data?.id}/edit`)
                     closeContextMenu()
                   }}
                 >
                   <Edit3 className="h-4 w-4" />
                   <span>Edit Channel</span>
                 </button>
                 {canManageRoles && (
                   <button
                     className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded text-sm"
                     onClick={() => {
                       router.push(`/server/${serverId}/channels/${contextMenu.data?.id}/edit?section=permissions`)
                       closeContextMenu()
                     }}
                   >
                     <Shield className="h-4 w-4" />
                     <span>Channel Permissions (Page)</span>
                   </button>
                 )}
                 <button 
                   className="w-full flex items-center space-x-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded text-sm"
                   onClick={() => {
                     deleteChannel(contextMenu.data?.id, contextMenu.data?.name)
                     closeContextMenu()
                   }}
                 >
                   <Trash2 className="h-4 w-4" />
                   <span>Delete Channel</span>
                 </button>
               </>
             )}
             
             {contextMenu.type === 'member' && (
               <>
                 <button 
                   className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded text-sm"
                   onClick={() => openUserProfile(contextMenu.data, 'landscape')}
                 >
                   <UsersIcon className="h-4 w-4" />
                   <span>View Profile</span>
                 </button>
                 <button 
                   className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded text-sm"
                   onClick={() => handleMentionUser(contextMenu.data.username)}
                 >
                   <AtSign className="h-4 w-4" />
                   <span>Mention User</span>
                 </button>
                 <button 
                   className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded text-sm"
                   onClick={() => {
                     // Reply to message
                     handleReply(contextMenu.data)
                     closeContextMenu()
                   }}
                 >
                   <MessageSquare className="h-4 w-4" />
                   <span>Reply</span>
                 </button>

                  {canManageRoles && (
                    <div className="mt-1 pt-1 border-t border-white/10">
                      <div className="px-3 py-1 text-[11px] uppercase tracking-wider text-gray-400">Roles</div>
                      {roles.length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-400">No roles</div>
                      )}
                      {roles.map(r => (
                        <button
                          key={r.id}
                          className={`w-full flex items-center justify-between px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded text-sm`}
                          onClick={() => { handleMemberRoleChange(contextMenu.data.id, r.id); closeContextMenu() }}
                        >
                          <span>{r.name}</span>
                          {contextMenu.data.roleId === r.id && <span className="text-purple-400">•</span>}
                        </button>
                      ))}
                      <button
                        className="w-full flex items-center justify-between px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => { handleMemberRoleChange(contextMenu.data.id, null); closeContextMenu() }}
                        disabled={!contextMenu.data.roleId}
                      >
                        <span>Remove Role</span>
                      </button>
                    </div>
                  )}
               </>
             )}
             
             {contextMenu.type === 'message' && (
               <>
                 <button 
                   className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded text-sm"
                   onClick={() => {
                     // Copy message
                     navigator.clipboard.writeText(contextMenu.data.content)
                     closeContextMenu()
                   }}
                 >
                   <Copy className="h-4 w-4" />
                   <span>Copy Message</span>
                 </button>
                 <button 
                   className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded text-sm"
                   onClick={() => {
                     // Reply to message
                     handleReply(contextMenu.data)
                     closeContextMenu()
                   }}
                 >
                   <MessageSquare className="h-4 w-4" />
                   <span>Reply</span>
                 </button>
                 <button 
                   className="w-full flex items-center space-x-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded text-sm"
                   onClick={() => {
                     // Report message
                     closeContextMenu()
                   }}
                 >
                   <Flag className="h-4 w-4" />
                   <span>Report Message</span>
                 </button>
               </>
             )}
             
             {contextMenu.type === 'user' && (
               <>
                 <button 
                   className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded text-sm"
                   onClick={() => openUserProfile(contextMenu.data, 'chat')}
                 >
                   <UsersIcon className="h-4 w-4" />
                   <span>View Profile</span>
                 </button>
                 <button 
                   className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded text-sm"
                   onClick={() => handleMentionUser(contextMenu.data.username)}
                 >
                   <AtSign className="h-4 w-4" />
                   <span>Mention User</span>
                 </button>
               </>
             )}
           </div>
         </div>
       )}

       {/* User Profile Modal */}
      {showUserProfile && selectedUser && (
        <UserProfileModal
          isOpen={showUserProfile}
          onClose={() => setShowUserProfile(false)}
          displayName={userProfileData.displayName || selectedUser.name}
          username={selectedUser.username}
          bannerUrl={userProfileData.banner || null}
          avatarUrl={userProfileData.avatar || null}
          avatarDecoration={userProfileData.avatarDecoration || null}
          status={userProfileData.status}
          presenceClass={presenceColorClass(
            computeEffectivePresence(userProfileData.status as any, { isSelf: selectedUser.id === (session?.user as any)?.id })
          )}
          roleName={(roles.find(r => r.id === (selectedUser as any).roleId)?.name) || null}
          roleColor={(roles.find(r => r.id === (selectedUser as any).roleId)?.color) || null}
          createdAt={userProfileData.createdAt}
          description={userProfileData.description}
          roles={(selectedUser as any).roles || []}
        />
      )}

       {/* Channel Customization Modal */}
       <ChannelCustomizationModal
         isOpen={showChannelCustomization}
         onClose={() => setShowChannelCustomization(false)}
         channel={selectedChannelForCustomization}
         onSave={handleChannelCustomization}
       />

       {/* Voice Channel Modal */}
       <VoiceChannelModal
         isOpen={showVoiceChannelModal}
         onClose={() => setShowVoiceChannelModal(false)}
         channel={selectedChannelForCustomization}
       />

       {/* Context menu UI */}
       {contextMenuState.show && contextMenuState.message && (
         <div
           className="fixed z-50 bg-gray-900 border border-blue-500 rounded-lg shadow-lg py-2 px-2 min-w-[180px] animate-fade-in"
           style={{ top: contextMenuState.y, left: contextMenuState.x }}
           onClick={e => e.stopPropagation()}
         >
           {/* Permission logic */}
           {((session?.user as any)?.isAdmin || (session?.user as any)?.id === contextMenuState.message?.userId) && contextMenuState.message && (
             <button
               className={`w-full text-left px-3 py-2 hover:bg-blue-700/40 rounded text-red-400 hover:text-red-200 ${deletingMessageId === contextMenuState.message.id ? 'opacity-50 cursor-wait' : ''}`}
               onClick={() => handleDeleteMessage(contextMenuState.message!)}
               disabled={deletingMessageId === contextMenuState.message.id}
             >
               {deletingMessageId === contextMenuState.message.id ? 'Deleting...' : 'Delete Message'}
             </button>
           )}
           {(session?.user as any)?.id === contextMenuState.message?.userId && contextMenuState.message && (
             <button
               className="w-full text-left px-3 py-2 hover:bg-blue-700/40 rounded text-yellow-300 hover:text-yellow-100"
               onClick={() => handleEditMessage(contextMenuState.message!)}
             >
               Edit Message
             </button>
           )}
           <button
             className="w-full text-left px-3 py-2 hover:bg-blue-700/40 rounded text-blue-300 hover:text-blue-100"
             onClick={() => {
               handleReply(contextMenuState.message!)
               setContextMenuState(s => ({ ...s, show: false, message: null }))
             }}
           >
             Reply
           </button>
           <button
             className="w-full text-left px-3 py-2 hover:bg-blue-700/40 rounded text-green-300 hover:text-green-100"
             onClick={() => {
               handleForward(contextMenuState.message!)
               setContextMenuState(s => ({ ...s, show: false, message: null }))
             }}
           >
             Forward to Channel
           </button>
           {(session?.user as any)?.isAdmin && (
             <button
               className="w-full text-left px-3 py-2 hover:bg-blue-700/40 rounded text-purple-300 hover:text-purple-100"
               onClick={() => {
                 handleReadReceipts(contextMenuState.message!)
                 setContextMenuState(s => ({ ...s, show: false, message: null }))
               }}
             >
               View Read Receipts
             </button>
           )}
         </div>
       )}

       {/* Forward Message Modal */}
       {showForwardModal && forwardingMessage && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
           <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-white/20 animate-fade-in">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-bold text-white">Forward Message</h2>
               <button
                 onClick={cancelForward}
                 className="text-gray-400 hover:text-white transition-colors"
               >
                 <X className="h-6 w-6" />
               </button>
             </div>
             
             <div className="mb-6">
               <p className="text-gray-300 mb-4">Select a channel to forward this message to:</p>
               <div className="space-y-2 max-h-60 overflow-y-auto">
                 {categories.map(category => 
                   category.channels.map(channel => (
                     <button
                       key={channel.id}
                       onClick={() => setForwardTargetChannel(channel.id)}
                       className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                         forwardTargetChannel === channel.id
                           ? 'bg-purple-500/20 border border-purple-500 text-purple-300'
                           : 'bg-gray-800/50 border border-gray-700 text-gray-300 hover:bg-gray-700/50'
                       }`}
                     >
                       <div className="flex items-center space-x-2">
                         <Hash className="h-4 w-4" />
                         <span>{channel.name}</span>
                       </div>
                       <div className="text-xs text-gray-400 mt-1">
                         {category.name}
                       </div>
                     </button>
                   ))
                 )}
               </div>
             </div>
             
             <div className="flex space-x-3">
               <button
                 onClick={cancelForward}
                 className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
               >
                 Cancel
               </button>
               <button
                 onClick={executeForward}
                 disabled={!forwardTargetChannel}
                 className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Forward
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Read Receipts Modal */}
       {showReadReceipts && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
           <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-white/20 animate-fade-in">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-bold text-white">Read Receipts</h2>
               <button
                 onClick={closeReadReceipts}
                 className="text-gray-400 hover:text-white transition-colors"
               >
                 <X className="h-6 w-6" />
               </button>
             </div>
             
             {readReceiptsLoading ? (
               <div className="flex flex-col items-center justify-center py-12 animate-pulse">
                 <Loader2 className="h-10 w-10 text-white animate-spin mb-4" />
                 <span className="text-gray-300">Loading read receipts...</span>
               </div>
             ) : readReceiptsData ? (
               <div>
                 <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                   <p className="text-gray-300 text-sm">
                     <span className="text-purple-400 font-medium">{readReceiptsData.totalViews}</span> people have read this message
                   </p>
                 </div>
                 
                 <div className="space-y-3 max-h-60 overflow-y-auto">
                   {readReceiptsData.views.map((view: any) => (
                     <div key={view.userId} className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                       <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                         {view.avatar ? (
                           <img src={view.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                         ) : (
                           <span className="text-white font-bold text-sm">{view.username?.charAt(0) || 'U'}</span>
                         )}
                       </div>
                       <div className="flex-1">
                         <div className="text-white font-medium">{view.displayName || view.username}</div>
                         <div className="text-gray-400 text-sm">
                           Read at {new Date(view.viewedAt).toLocaleString()}
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
                 
                 {readReceiptsData.views.length === 0 && (
                   <div className="text-center py-8">
                     <Eye className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                     <p className="text-gray-400">No one has read this message yet</p>
                   </div>
                 )}
               </div>
             ) : (
               <div className="text-center py-8">
                 <p className="text-gray-400">Failed to load read receipts</p>
               </div>
             )}
           </div>
         </div>
       )}
    </div>
  )
} 