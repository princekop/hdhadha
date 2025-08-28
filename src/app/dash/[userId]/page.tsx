'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { 
  MessageSquare, 
  Users, 
  Settings, 
  LogOut, 
  Plus,
  Hash,
  Mic,
  Volume2,
  User,
  Search,
  Crown,
  Edit3,
  MoreHorizontal,
  Home,
  Server,
  UserPlus,
  Globe,
  Star,
  Sparkles,
  Zap,
  Shield,
  Heart,
  TrendingUp,
  Users2,
  Hash as HashIcon,
  Mic as MicIcon,
  Volume2 as Volume2Icon,
  Menu,
  X
  , Github,
  Twitter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import ElectricBorder from '@/components/ElectricBorder'
import { Input } from '@/components/ui/input'
import FuzzyText from '@/components/FuzzyText'
import CreateServerModal from '@/components/CreateServerModal'
import InviteModal from '@/components/InviteModal'
import React from "react";
import { useRef } from 'react';
import Avatar from '@/components/Avatar'
import ProfileEffect from '@/components/ProfileEffect'
import ProfileVideoEffect from '@/components/ProfileVideoEffect'
import { format } from 'date-fns'
import LandscapeProfileWidget from '@/components/LandscapeProfileWidget'
 

export default function UserDashboard() {
  const { userId } = useParams<{ userId: string }>()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showProfileWidget, setShowProfileWidget] = useState(false)
  const [userStatus, setUserStatus] = useState('online')
  const [profileInfo, setProfileInfo] = useState<any | null>(null)
  
  const [servers, setServers] = useState<any[]>([])

  // Decorative profile effect image set (place images in public/uploads/leaves)
  const leafImages = [
    '/uploads/leaves/leaf1.png',
    '/uploads/leaves/leaf2.png',
    '/uploads/leaves/leaf3.png',
    '/uploads/leaves/leaf4.png',
    '/uploads/leaves/leaf5.png',
  ]

  // Appearance state (shared with server page via localStorage: 'db_appearance')
  const [theme, setTheme] = useState<string>('default')
  const [chatBgUrl, setChatBgUrl] = useState<string>('')
  const [chatBgOpacity, setChatBgOpacity] = useState<number>(30)

  const [advertisedServers, setAdvertisedServers] = useState<any[]>([])
  const FEATURED_SERVER_ID = process.env.NEXT_PUBLIC_FEATURED_SERVER_ID as string | undefined

  const [showCreateServer, setShowCreateServer] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Profile video effect controls
  const [effectEnabled, setEffectEnabled] = useState<boolean>(true)
  const [effectOpacity, setEffectOpacity] = useState<number>(60)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('db_profile_video_effect')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.enabled === 'boolean') setEffectEnabled(parsed.enabled)
        if (typeof parsed.opacity === 'number') setEffectOpacity(parsed.opacity)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('db_profile_video_effect', JSON.stringify({ enabled: effectEnabled, opacity: effectOpacity }))
    } catch {}
  }, [effectEnabled, effectOpacity])
  const [selectedServer, setSelectedServer] = useState<{ id: string; name: string } | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [editServer, setEditServer] = useState<any>(null);
  const [deleteServer, setDeleteServer] = useState<any>(null);
  const [inviteServer, setInviteServer] = useState<any>(null);
  const [serverNameInput, setServerNameInput] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [serversLoading, setServersLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Resolve image values (filename or url) to absolute URLs
  const resolveImageUrl = (val: any): string => {
    if (!val) return ''
    const v = typeof val === 'string' ? val : (val?.url || '')
    if (!v) return ''
    if (/^(https?:|data:|blob:|\/.+)/.test(v)) return v
    // treat as uploaded filename
    return `/uploads/${v}`
  }

  // Close profile widget on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProfileWidget(false);
    };
    if (showProfileWidget) {
      window.addEventListener('keydown', onKey);
    }
    return () => window.removeEventListener('keydown', onKey);
  }, [showProfileWidget]);

  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user.id !== userId) {
      router.push('/register')
    }
  }, [session, status, userId, router])

  // Load appearance on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('db_appearance')
      if (saved) {
        const obj = JSON.parse(saved)
        if (obj.theme) setTheme(obj.theme)
        if (typeof obj.chatBgUrl === 'string') setChatBgUrl(obj.chatBgUrl)
        if (typeof obj.chatBgOpacity === 'number') setChatBgOpacity(obj.chatBgOpacity)
      }
    } catch {}
  }, [])

  // Persist appearance when changed
  useEffect(() => {
    try {
      const obj = { theme, chatBgUrl, chatBgOpacity }
      localStorage.setItem('db_appearance', JSON.stringify(obj))
    } catch {}
  }, [theme, chatBgUrl, chatBgOpacity])

  // Load full profile data to display banner, about me, decoration, created date
  useEffect(() => {
    const load = async () => {
      if (!userId) return
      try {
        const res = await fetch(`/api/users/${userId}/profile`)
        if (res.ok) {
          const data = await res.json()
          setProfileInfo(data)
        }
      } catch {}
    }
    load()
  }, [userId])

  // Fetch user's servers
  useEffect(() => {
    const fetchServers = async () => {
      if (!userId) return;
      
      setServersLoading(true);
      try {
        const response = await fetch(`/api/servers?userId=${userId}`)
        if (response.ok) {
          const userServers = await response.json()
          setServers(Array.isArray(userServers) ? userServers : [])
        }
      } catch (error) {
        console.error('Error fetching servers:', error)
        // On error, keep empty list
      } finally {
        setServersLoading(false);
      }
    }

    fetchServers()
  }, [userId])

  // Fetch and show only the featured server in advertised section
  useEffect(() => {
    if (!FEATURED_SERVER_ID) return
    const fetchFeatured = async () => {
      try {
        const res = await fetch(`/api/servers/${FEATURED_SERVER_ID}`)
        if (!res.ok) return
        const server = await res.json()
        const name: string = server.name || 'Featured Server'
        const iconUrl: string = server.icon || ''
        const description: string = server.description || ''
        const members: number = server.members ?? server._aggr_count_members ?? 0
        const icon: string = (name?.match(/\b\w/g) || []).slice(0,2).join('').toUpperCase() || 'SV'
        const bannerUrl: string = server.banner || ''
        setAdvertisedServers([{ id: FEATURED_SERVER_ID, name, icon, iconUrl, bannerUrl, description, members, isPublic: true, featured: true }])
      } catch {}
    }
    fetchFeatured()
  }, [FEATURED_SERVER_ID])

  // Listen for server updates
  useEffect(() => {
    const handleServerUpdate = (event: CustomEvent) => {
      // Refresh servers list when any server is updated
      const fetchServers = async () => {
        try {
          const response = await fetch(`/api/servers?userId=${userId}`)
          if (response.ok) {
            const userServers = await response.json()
            if (Array.isArray(userServers) && userServers.length > 0) {
              setServers(userServers)
            }
          }
        } catch (error) {
          console.error('Error fetching servers:', error)
        }
      }
      fetchServers()
    }

    window.addEventListener('serverUpdated', handleServerUpdate as EventListener)
    
    return () => {
      window.removeEventListener('serverUpdated', handleServerUpdate as EventListener)
    }
  }, [userId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  const handleServerCreated = (newServer: any) => {
    setServers(prev => [...prev, newServer])
    setShowCreateServer(false)
  }

  const statusOptions = [
    { value: 'online', label: 'Online', color: 'bg-green-500' },
    { value: 'idle', label: 'Idle', color: 'bg-yellow-500' },
    { value: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500' },
    { value: 'offline', label: 'Invisible', color: 'bg-gray-500' }
  ]

  // Separate servers by type
  const ownedServers = servers.filter(server => server.type === 'owned')
  const joinedServers = servers.filter(server => server.type === 'joined')

  // Search filter
  const [search, setSearch] = useState('')
  const norm = (v: any) => (typeof v === 'string' ? v.toLowerCase() : '')
  const query = norm(search)
  const match = (s: any) => {
    if (!query) return true
    return (
      norm(s?.name).includes(query) ||
      norm(s?.description).includes(query)
    )
  }
  const ownedFiltered = ownedServers.filter(match)
  const joinedFiltered = joinedServers.filter(match)

  if (status === 'loading' || serversLoading) {
    return (
      <div className="min-h-screen flex bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0b0d12] via-[#0f1115] to-[#0b0d12]">
        {/* Sidebar Skeleton */}
        <div className="w-20 bg-white/5 backdrop-blur-2xl border-r border-skyBlue/30 flex flex-col items-center py-6 space-y-6 animate-pulse">
          <div className="w-12 h-12 bg-white/10 rounded-xl mb-4" />
          <div className="w-12 h-12 bg-white/10 rounded-xl mb-4" />
          <div className="w-12 h-12 bg-white/10 rounded-xl mb-4" />
          <div className="w-12 h-12 bg-white/10 rounded-xl" />
        </div>
        {/* Main Content Skeleton */}
        <div className="flex-1 p-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 w-1/3 bg-white/10 rounded mb-2" />
            <div className="h-4 w-1/4 bg-white/10 rounded" />
          </div>
          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-white/5 backdrop-blur-2xl rounded-2xl p-6 border border-white/10">
                <div className="h-8 w-1/2 bg-white/10 rounded mb-4" />
                <div className="h-4 w-1/3 bg-white/10 rounded mb-2" />
                <div className="h-4 w-1/4 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // After loading, if servers.length === 0, show a friendly message and create server button
  if (servers.length === 0 && !serversLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0b0d12] via-[#0f1115] to-[#0b0d12]">
        <div className="flex flex-1">
          {/* Sidebar (hidden on small screens) */}
          <div className="hidden md:flex sticky top-0 w-24 bg-[#0f1115]/80 backdrop-blur-2xl border-r border-skyBlue/30 flex-col items-center py-6 space-y-5 shadow-[0_0_24px_rgba(56,189,248,0.25)] ring-1 ring-white/5 z-30 min-h-screen">
            {/* Home */}
            <div className="group relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border border-skyBlue/50 bg-gradient-to-br from-[#141821] to-[#0b0d12] shadow-lg transition-all duration-200 hover:ring-2 hover:ring-skyBlue/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50" role="button" tabIndex={0} aria-label="Home">
              <Home className="h-6 w-6 text-skyBlue group-hover:scale-110 transition-transform" />
            </div>
            {/* Separator */}
            <div className="w-10 h-px bg-gradient-to-r from-transparent via-skyBlue/40 to-transparent"></div>
            {/* Create Server */}
            <button 
              aria-label="Create Server"
              className="group relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border border-skyBlue/60 bg-gradient-to-br from-sky-400 to-cyan-400 shadow-lg hover:shadow-sky-400/40 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
              onClick={() => setShowCreateServer(true)}
            >
              <Plus className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
              <div className="absolute left-16 bg-[#0f1115] border border-skyBlue/60 text-skyBlue text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl">
                Create Server
              </div>
            </button>
            {/* Join Server */}
            <div className="group relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border border-skyBlue/50 bg-gradient-to-br from-[#141821] to-[#0b0d12] shadow-lg transition-all duration-200 hover:ring-2 hover:ring-skyBlue/40">
              <UserPlus className="h-6 w-6 text-skyBlue group-hover:scale-110 transition-transform" />
              <div className="absolute left-16 bg-[#0f1115] border border-skyBlue/60 text-skyBlue text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl">
                Join Server
              </div>
            </div>
            {/* Discover */}
            <div className="group relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border border-skyBlue/50 bg-gradient-to-br from-[#141821] to-[#0b0d12] shadow-lg transition-all duration-200 hover:ring-2 hover:ring-skyBlue/40">
              <Globe className="h-6 w-6 text-skyBlue group-hover:scale-110 transition-transform" />
              <div className="absolute left-16 bg-[#0f1115] border border-skyBlue/60 text-skyBlue text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl">
                Discover
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col p-8 items-center justify-center">
            <h1 className="text-3xl font-bold text-skyBlue animate-shine mb-4">No Servers Yet</h1>
            <p className="text-white mb-6">You don't have any servers. Create your first server to get started!</p>
            <button className="px-6 py-3 bg-skyBlue text-white rounded-lg font-semibold shadow-lg hover:bg-skyBlue/80 transition" onClick={() => setShowCreateServer(true)}>
              + Create Server
            </button>
          </div>
        </div>
        {/* Create Server Modal (empty-state) */}
        {showCreateServer && (
          <CreateServerModal
            onClose={() => setShowCreateServer(false)}
            onServerCreated={handleServerCreated}
            userId={userId}
          />
        )}
      </div>
    );
  }

  if (!session || session.user.id !== userId) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0b0d12] via-[#0f1115] to-[#0b0d12] relative overflow-hidden text-[13px] sm:text-[14px] lg:text-[15px] antialiased">
      {/* Background accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-28 w-[40rem] h-[40rem] rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.08),transparent_40%),radial-gradient(circle_at_80%_90%,rgba(6,182,212,0.08),transparent_45%)]" />
      </div>
      <div className="relative z-10 flex">
        {/* Mobile Sidebar Drawer */}
        {showMobileSidebar && (
          <div className="md:hidden">
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowMobileSidebar(false)}
            />
            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0f1115] border-r border-skyBlue/30 shadow-2xl z-50 flex flex-col py-6">
              <div className="px-4 mb-4 flex items-center justify-between">
                <div className="text-skyBlue font-semibold">Menu</div>
                <button
                  aria-label="Close sidebar"
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white"
                  onClick={() => setShowMobileSidebar(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-4 space-y-4">
                <button
                  onClick={() => { router.push(`/dash/${userId}`); setShowMobileSidebar(false); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-skyBlue/40 bg-gradient-to-br from-[#141821] to-[#0b0d12] hover:ring-2 hover:ring-skyBlue/40 text-left"
                >
                  <Home className="h-5 w-5 text-skyBlue" />
                  <span className="text-white">Home</span>
                </button>
                <button
                  onClick={() => { setShowCreateServer(true); setShowMobileSidebar(false); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-skyBlue/60 bg-gradient-to-br from-sky-400 to-cyan-400 text-white"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-semibold">Create Server</span>
                </button>
                <button
                  onClick={() => { setShowJoinModal(true); setJoinCode(''); setJoinError(''); setShowMobileSidebar(false); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-skyBlue/40 bg-white/5 text-skyBlue"
                >
                  <UserPlus className="h-5 w-5" />
                  <span className="font-semibold">Join Server</span>
                </button>
                <button
                  onClick={() => { router.push(`/dash/dash/${userId}`); setShowMobileSidebar(false); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-skyBlue/40 bg-white/5 text-skyBlue"
                >
                  <Globe className="h-5 w-5" />
                  <span className="font-semibold">Discover</span>
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Left Sidebar (hidden on small screens) */}
        <div className="hidden md:flex sticky top-0 w-24 bg-[#0f1115]/80 backdrop-blur-2xl border-r border-skyBlue/30 flex-col items-center py-6 space-y-5 shadow-[0_0_24px_rgba(56,189,248,0.25)] ring-1 ring-white/5 z-30 min-h-screen">
          {/* Home */}
          <button
            onClick={() => router.push(`/dash/${userId}`)}
            className="group relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border border-skyBlue/50 bg-gradient-to-br from-[#141821] to-[#0b0d12] shadow-lg transition-all duration-200 hover:ring-2 hover:ring-skyBlue/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
            aria-label="Home"
          >
            <Home className="h-6 w-6 text-skyBlue group-hover:scale-110 transition-transform" />
          </button>
          {/* Separator */}
          <div className="w-10 h-px bg-gradient-to-r from-transparent via-skyBlue/40 to-transparent"></div>
          {/* Create Server - FIXED FUNCTIONALITY */}
          <button 
            aria-label="Create Server"
            className="group relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border border-skyBlue/60 bg-gradient-to-br from-sky-400 to-cyan-400 shadow-lg hover:shadow-sky-400/40 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
            onClick={() => setShowCreateServer(true)}
          >
            <Plus className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
            <div className="absolute left-16 bg-[#0f1115] border border-skyBlue/60 text-skyBlue text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl">
              Create Server
            </div>
          </button>
          {/* Join Server */}
          <button
            onClick={() => { setShowJoinModal(true); setJoinCode(''); setJoinError(''); }}
            className="group relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border border-skyBlue/50 bg-gradient-to-br from-[#141821] to-[#0b0d12] shadow-lg transition-all duration-200 hover:ring-2 hover:ring-skyBlue/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
          >
            <UserPlus className="h-6 w-6 text-skyBlue group-hover:scale-110 transition-transform" />
            <div className="absolute left-16 bg-[#0f1115] border border-skyBlue/60 text-skyBlue text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl">
              Join Server
            </div>
          </button>
          {/* Discover */}
          <button
            aria-label="Discover"
            className="group relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border border-skyBlue/50 bg-gradient-to-br from-[#141821] to-[#0b0d12] shadow-lg transition-all duration-200 hover:ring-2 hover:ring-skyBlue/40"
            onClick={() => router.push(`/dash/dash/${userId}`)}
          >
            <Globe className="h-6 w-6 text-skyBlue group-hover:scale-110 transition-transform" />
            <div className="absolute left-16 bg-[#0f1115] border border-skyBlue/60 text-skyBlue text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl">
              Discover
            </div>
          </button>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
          {/* Top Navbar */}
          <div className="sticky top-0 z-20 -mt-4 mb-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white"
              onClick={() => setShowMobileSidebar(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search servers..."
                className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 sm:px-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                aria-label="Search servers"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              className="hidden sm:inline-flex items-center gap-2 px-3 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 text-white border border-skyBlue/50 shadow hover:shadow-sky-400/30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
              onClick={() => setShowCreateServer(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-semibold">Create</span>
            </button>
            <button
              className="hidden sm:inline-flex items-center gap-2 px-3 h-10 rounded-xl bg-white/5 text-skyBlue border border-skyBlue/40 hover:bg-white/10 transition"
              onClick={() => { setShowJoinModal(true); setJoinCode(''); setJoinError(''); }}
            >
              <UserPlus className="h-4 w-4" />
              <span className="text-sm font-semibold">Join</span>
            </button>
            <button
              className="hidden sm:inline-flex items-center gap-2 px-3 h-10 rounded-xl bg-white/5 text-cyan-300 border border-cyan-400/40 hover:bg-white/10 transition"
              onClick={() => {
                const id = (session?.user as any)?.id ?? userId
                router.push(`/ai/convert/${id}`)
              }}
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">AI</span>
            </button>
            <a href="#featured" className="hidden sm:inline-flex items-center gap-2 px-3 h-10 rounded-xl bg-white/5 text-skyBlue border border-skyBlue/40 hover:bg-white/10 transition">
              <Globe className="h-4 w-4" />
              <span className="text-sm font-semibold">Discover</span>
            </a>
          </div>
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="inline-block rounded-2xl px-4 py-2 bg-gradient-to-br from-[#0b0d12]/80 to-[#141821]/80 border border-purple-400/30 shadow-[0_0_24px_rgba(168,85,247,0.18)] backdrop-blur-xl">
                <FuzzyText
                  baseIntensity={0.2}
                  hoverIntensity={0.45}
                  enableHover={true}
                  fontSize="clamp(1.75rem, 4vw, 2.75rem)"
                  fontWeight={900}
                  color="#c084fc"
                >
                  {`Welcome back, ${session.user.displayName} 🖐️`}
                </FuzzyText>
              </div>
              <p className="mt-2 font-semibold bg-gradient-to-r from-purple-300 via-skyBlue to-cyan-300 bg-clip-text text-transparent tracking-wide">
                Manage your servers and communities
              </p>
            </div>
            {/* Profile Area */}
            <div className="relative">
              <div
                onClick={() => setShowProfileWidget(!showProfileWidget)}
                aria-label="Open profile"
                className="flex items-center gap-3 px-3 py-2 rounded-xl border border-skyBlue/50 hover:bg-white/5 hover:ring-2 hover:ring-skyBlue/40 transition shadow-[0_0_12px_rgba(56,189,248,0.15)]"
              >
                <div className="relative">
                  <ProfileEffect images={leafImages} size={56}>
                    <Avatar
                      src={session.user.avatar}
                      alt={session.user.displayName || 'Avatar'}
                      size={48}
                      decorationSlug={(profileInfo?.avatarDecoration ?? (session.user as any)?.avatarDecoration) || null}
                    />
                  </ProfileEffect>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    userStatus === 'online' ? 'bg-green-500' :
                    userStatus === 'idle' ? 'bg-yellow-500' :
                    userStatus === 'dnd' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`}></div>
                </div>
                <div>
                  <div className="text-skyBlue font-semibold">{session.user.displayName}</div>
                  <div className="text-skyBlue text-sm capitalize">{userStatus}</div>
                </div>
                <Edit3 className="h-4 w-4 text-skyBlue" />
              </div>
              {/* Profile Widget */}
              {showProfileWidget && (
                <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
                  {/* Backdrop */}
                  <div className="absolute inset-0 bg-black/50" onClick={() => setShowProfileWidget(false)} />

                  {/* Panel */}
                  <div className="absolute right-4 top-20 md:right-8 md:top-24 w-[95%] max-w-[44rem]">
                    <div className="overflow-hidden rounded-2xl border-2 border-skyBlue shadow-2xl bg-[#0f0f12]" onContextMenu={(e) => e.preventDefault()}>
                      <LandscapeProfileWidget
                        avatarUrl={profileInfo?.avatar ?? session.user.avatar}
                        bannerUrl={profileInfo?.banner || ''}
                        decorationSlug={(profileInfo?.avatarDecoration ?? (session.user as any)?.avatarDecoration) || null}
                        displayName={session.user.displayName}
                        username={session.user.username}
                        status={userStatus as any}
                        description={profileInfo?.description}
                        createdAt={profileInfo?.createdAt}
                        roleName={(profileInfo?.primaryRole?.name) || (profileInfo?.roleName) || (session.user as any)?.role || 'Member'}
                        onStatusChange={(s) => setUserStatus(s)}
                      />
                      <div className="px-6 py-4 border-t border-white/10">
                        {/* Member since */}
                        <div className="mb-4 text-gray-300 text-sm">
                          <span className="text-skyBlue font-medium">Member since:</span>{' '}
                          {profileInfo?.createdAt ? format(new Date(profileInfo.createdAt), 'PP') : '—'}
                        </div>
                        {/* Action Buttons */}
                        <div className="space-y-2">
                          <button className="w-full bg-white/10 text-skyBlue py-2 px-4 rounded-lg hover:bg-white/15 transition-all duration-200 text-sm border border-white/10" onClick={() => router.push('/profile/edit/appearance')}>
                            Appearance
                          </button>
                          <button className="w-full bg-skyBlue text-white py-2 px-4 rounded-lg hover:bg-skyBlue/80 transition-all duration-200 text-sm" onClick={() => router.push('/profile/edit')}>
                            Edit Profile
                          </button>
                          <button
                            onClick={() => router.push('/settings')}
                            className="w-full bg-white/10 text-skyBlue py-2 px-4 rounded-lg hover:bg-white/15 transition-all duration-200 text-sm border border-white/10 flex items-center justify-center gap-2"
                          >
                            <Settings className="h-4 w-4" />
                            Settings
                          </button>
                          <button 
                            onClick={handleSignOut}
                            className="w-full bg-red-500/20 text-red-400 py-2 px-4 rounded-lg hover:bg-red-500/30 transition-all duration-200 text-sm border border-red-500/30"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Two-column layout: main + right sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            <div>
              {/* Profile Card removed from dashboard to keep focus on server discovery */}
              {/* Advertised Servers Section - TOP */}
              {advertisedServers.length > 0 && (
                <div id="featured" className="mb-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-skyBlue to-cyan-300 bg-clip-text text-transparent">
                      Featured Communities
                    </h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-purple-400/50 via-skyBlue/30 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {advertisedServers.slice(0, 3).map((server) => (
                      <ElectricBorder
                        key={server.id}
                        color="#7df9ff"
                        speed={1}
                        chaos={0.5}
                        thickness={2}
                        style={{ borderRadius: 16 }}
                      >
                        <div
                          className="group bg-[#121318] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-2xl"
                          onClick={() => router.push(`/server/${FEATURED_SERVER_ID}`)}
                        >
                      {/* Banner (top half) */}
                      {(() => {
                        const bannerUrl = resolveImageUrl(server.bannerUrl || server.banner)
                        return bannerUrl ? (
                          <div className="relative h-28 md:h-32">
                            <img
                              src={bannerUrl}
                              alt={`${server.name} banner`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                          </div>
                        ) : (
                          <div className="relative h-28 md:h-32 bg-gradient-to-br from-yellow-400/10 to-orange-400/10" />
                        )
                      })()}

                      {/* Content (bottom half) */}
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          {(() => {
                            const iconUrl = resolveImageUrl(server.iconUrl || server.icon)
                            return (
                              <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-yellow-400/30 bg-white/5 backdrop-blur-xl flex items-center justify-center shadow-lg">
                                {iconUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={iconUrl} alt={server.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-yellow-400 font-bold">{server.icon || server.name?.charAt(0)}</span>
                                )}
                              </div>
                            )
                          })()}
                          <div className="flex items-center space-x-2">
                            <Star className="h-5 w-5 text-yellow-400" />
                            <TrendingUp className="h-4 w-4 text-green-400" />
                          </div>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-1">{server.name}</h3>
                        <p className="text-gray-300 text-sm mb-3 line-clamp-2">{server.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users2 className="h-4 w-4 text-yellow-400" />
                            <span className="text-white text-sm font-medium">{server.members} members</span>
                          </div>
                          <div className="px-3 py-1 rounded-full text-xs bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                            Featured
                          </div>
                        </div>
                      </div>
                    </div>
                  </ElectricBorder>
                ))}
              </div>
            </div>
          )}

          {/* Owned Servers Section */}
          {ownedFiltered.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <Crown className="h-6 w-6 text-purple-400" />
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-skyBlue to-cyan-300 bg-clip-text text-transparent">
                  Your Servers
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-purple-400/50 via-skyBlue/30 to-transparent"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ownedFiltered.map((server) => {
                  const bannerUrl = resolveImageUrl(server.bannerUrl || server.banner) || ''
                  return (
                    <div
                      key={server.id}
                      className="group bg-white/[0.04] to-transparent backdrop-blur-2xl rounded-2xl border border-skyBlue/30 hover:border-skyBlue/50 transition-all duration-300 cursor-pointer hover:scale-[1.03] shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_40px_rgba(56,189,248,0.15)] overflow-hidden"
                      onClick={() => router.push(`/server/${server.id}`)}
                    >
                      {/* Banner top */}
                      {bannerUrl ? (
                        <div className="relative h-24 md:h-28">
                          <img src={bannerUrl} alt={`${server.name} banner`} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        </div>
                      ) : (
                        <div className="relative h-24 md:h-28 bg-gradient-to-br from-skyBlue/10 to-blue-400/10" />
                      )}

                      {/* Content */}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          {(() => {
                            const iconUrl = resolveImageUrl(server.iconUrl || server.icon)
                            return (
                              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-skyBlue/30 bg-white/5 backdrop-blur-xl flex items-center justify-center shadow-lg">
                                {iconUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={iconUrl} alt={server.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-skyBlue font-bold text-xl">{server.icon || server.name?.charAt(0)}</span>
                                )}
                              </div>
                            )
                          })()}
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="p-2 rounded-lg hover:bg-white/5 transition opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
                              aria-label="Open server menu"
                              onClick={() => setOpenMenuId(openMenuId === server.id ? null : server.id)}
                            >
                              <MoreHorizontal className="h-5 w-5 text-white" />
                            </button>
                            {openMenuId === server.id && (
                              <div ref={menuRef} className="absolute right-0 mt-2 w-44 bg-[#0f1115] border border-skyBlue/30 rounded-xl shadow-xl z-10">
                                <button
                                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5"
                                  onClick={() => { setEditServer(server); setServerNameInput(server.name || ''); setOpenMenuId(null); }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5"
                                  onClick={async () => { setInviteServer(server); setOpenMenuId(null); setShowInviteModal(true); setSelectedServer({ id: server.id, name: server.name }); }}
                                >
                                  Invite
                                </button>
                                <button
                                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                                  onClick={() => { setDeleteServer(server); setOpenMenuId(null); }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2">{server.name}</h3>
                        <p className="text-gray-300 text-sm mb-4 line-clamp-2">{server.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users2 className="h-4 w-4 text-skyBlue" />
                            <span className="text-white text-sm font-medium">{server.members} members</span>
                          </div>
                          <div className="px-3 py-1 rounded-full text-xs bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                            Owner
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Joined Servers Section */}
          {joinedFiltered.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <Users className="h-6 w-6 text-purple-400" />
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-skyBlue to-cyan-300 bg-clip-text text-transparent">
                  Joined Communities
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-purple-400/50 via-skyBlue/30 to-transparent"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {joinedFiltered.map((server) => {
                  const bannerUrl = resolveImageUrl(server.bannerUrl || server.banner) || ''
                  return (
                    <div
                      key={server.id}
                      className="group bg-white/[0.04] to-transparent backdrop-blur-2xl rounded-2xl border border-blue-400/30 hover:border-blue-400/50 transition-all duration-300 cursor-pointer hover:scale-[1.03] shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_40px_rgba(59,130,246,0.15)] overflow-hidden"
                      onClick={() => router.push(`/server/${server.id}`)}
                    >
                      {/* Banner top */}
                      {bannerUrl ? (
                        <div className="relative h-24 md:h-28">
                          <img src={bannerUrl} alt={`${server.name} banner`} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        </div>
                      ) : (
                        <div className="relative h-24 md:h-28 bg-gradient-to-br from-blue-400/10 to-purple-400/10" />
                      )}

                      {/* Content */}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          {(() => {
                            const iconUrl = resolveImageUrl(server.iconUrl || server.icon)
                            return (
                              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-blue-400/30 bg-white/5 backdrop-blur-xl flex items-center justify-center shadow-lg">
                                {iconUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={iconUrl} alt={server.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-blue-400 font-bold text-xl">{server.icon || server.name?.charAt(0)}</span>
                                )}
                              </div>
                            )
                          })()}
                          <div className="flex items-center space-x-2">
                            <Shield className="h-5 w-5 text-blue-400" />
                          </div>
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2">{server.name}</h3>
                        <p className="text-gray-300 text-sm mb-4 line-clamp-2">{server.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users2 className="h-4 w-4 text-blue-400" />
                            <span className="text-white text-sm font-medium">{server.members} members</span>
                          </div>
                          <div className="px-3 py-1 rounded-full text-xs bg-blue-400/20 text-blue-400 border border-blue-400/30">
                            Member
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          </div>
          {/* Right Sidebar */}
          <aside className="hidden lg:flex lg:flex-col gap-6">
            {/* Profile Quick Card removed to avoid duplicate profile controls */}
            {/* Featured Server Promo */}
            {advertisedServers[0] && (
              <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                {advertisedServers[0].bannerUrl ? (
                  <img src={advertisedServers[0].bannerUrl} alt="featured" className="w-full h-24 object-cover" />
                ) : (
                  <div className="h-24 bg-gradient-to-br from-sky-400/10 to-cyan-400/10" />
                )}
                <div className="p-4">
                  <div className="text-white font-semibold mb-1">{advertisedServers[0].name}</div>
                  <div className="text-white/70 text-sm line-clamp-2 mb-3">{advertisedServers[0].description}</div>
                  <button
                    className="w-full h-9 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 text-white border border-skyBlue/50 hover:shadow-sky-400/30 transition"
                    onClick={() => router.push(`/server/${FEATURED_SERVER_ID}`)}
                  >
                    Explore
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>

          {/* Footer */}
          <footer className="w-full mt-10">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              {/* soft glow accents */}
              <div className="pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full bg-sky-400/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />

              <div className="relative p-6 sm:p-8">
                {/* Top grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Brand */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-skyBlue" />
                      <h3 className="text-white font-bold tracking-wide">Darkbyte</h3>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">
                      Build and grow your communities with a fast, elegant and secure experience.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-white/60">
                      <span className="inline-flex h-2 w-2 rounded-full bg-green-400/80"></span>
                      <span>All systems operational</span>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div>
                    <h4 className="text-white/90 font-semibold mb-3">Quick Links</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <a className="text-white/70 hover:text-white transition" href="#featured">Discover</a>
                      <button className="text-left text-white/70 hover:text-white transition" onClick={() => setShowCreateServer(true)}>Create</button>
                      <button className="text-left text-white/70 hover:text-white transition" onClick={() => { setShowJoinModal(true); setJoinCode(''); }}>Join</button>
                      <button className="text-left text-white/70 hover:text-white transition" onClick={() => router.push('/settings')}>Settings</button>
                    </div>
                  </div>

                  {/* Connect */}
                  <div>
                    <h4 className="text-white/90 font-semibold mb-3">Connect</h4>
                    <div className="flex items-center gap-3">
                      <a aria-label="GitHub" href="https://github.com/" target="_blank" rel="noreferrer" className="group inline-flex items-center justify-center h-10 w-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                        <Github className="h-5 w-5 text-white/80 group-hover:text-white" />
                      </a>
                      <a aria-label="Twitter" href="https://twitter.com/" target="_blank" rel="noreferrer" className="group inline-flex items-center justify-center h-10 w-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                        <Twitter className="h-5 w-5 text-white/80 group-hover:text-white" />
                      </a>
                      <a aria-label="Website" href="#" className="group inline-flex items-center justify-center h-10 w-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                        <Globe className="h-5 w-5 text-white/80 group-hover:text-white" />
                      </a>
                    </div>
                    <div className="mt-3 text-xs text-white/60">
                      Made with <Heart className="inline h-3.5 w-3.5 text-rose-400 align-text-bottom" /> for communities
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Bottom row */}
                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-skyBlue font-semibold">
                    © {new Date().getFullYear()} Darkbyte
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-white/60">
                    <a href="#" className="hover:text-white transition">Terms</a>
                    <a href="#" className="hover:text-white transition">Privacy</a>
                    <a href="#" className="hover:text-white transition">Status</a>
                    <span className="text-white/40">•</span>
                    <span>v1.0</span>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Create Server Modal */}
      {showCreateServer && (
        <CreateServerModal
          onClose={() => setShowCreateServer(false)}
          onServerCreated={handleServerCreated}
          userId={userId}
        />
      )}

      {/* Edit Modal */}
      {editServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#18181b] border-2 border-skyBlue rounded-2xl p-8 w-96 flex flex-col items-center">
            <h2 className="text-skyBlue font-bold text-xl mb-4 animate-shine">Edit Server</h2>
            <input
              className="w-full p-2 rounded bg-[#23232a] border border-skyBlue text-white mb-4"
              value={serverNameInput}
              onChange={e => setServerNameInput(e.target.value)}
              disabled={editLoading}
            />
            {editError && <div className="text-red-500 mb-2">{editError}</div>}
            <div className="flex space-x-4">
              <button className="px-4 py-2 bg-skyBlue text-white rounded" disabled={editLoading} onClick={async () => {
                setEditLoading(true); setEditError('');
                try {
                  const res = await fetch(`/api/servers/${editServer.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: serverNameInput })
                  });
                  if (!res.ok) throw new Error('Failed to update server');
                  const updated = await res.json();
                  setServers(servers.map(s => s.id === editServer.id ? { ...s, name: updated.name } : s));
                  setEditServer(null);
                } catch (e) {
                  setEditError('Failed to update server');
                } finally { setEditLoading(false); }
              }}>Save</button>
              <button className="px-4 py-2 bg-gray-600 text-white rounded" disabled={editLoading} onClick={() => setEditServer(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Join Server Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#18181b] border-2 border-skyBlue rounded-2xl p-8 w-[28rem] flex flex-col animate-fade-in">
            <h2 className="text-skyBlue font-bold text-xl mb-4">Join a Server</h2>
            <p className="text-gray-300 text-sm mb-4">Enter an invite code or paste a full invite link.</p>
            <input
              className="w-full p-2 rounded bg-[#23232a] border border-skyBlue text-white mb-3"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              placeholder="e.g. ABCDEF123456 or https://yourapp.com/invite/ABCDEF123456"
              disabled={joinLoading}
            />
            {joinError && <div className="text-red-500 text-sm mb-3">{joinError}</div>}
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded"
                disabled={joinLoading}
                onClick={() => { setShowJoinModal(false); setJoinCode(''); setJoinError(''); }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-skyBlue text-white rounded disabled:opacity-60"
                disabled={joinLoading || !joinCode.trim()}
                onClick={async () => {
                  setJoinLoading(true); setJoinError('');
                  try {
                    // Extract code from full URL or raw code
                    let code = joinCode.trim();
                    try {
                      const url = new URL(code);
                      const parts = url.pathname.split('/').filter(Boolean);
                      const idx = parts.findIndex(p => p.toLowerCase() === 'invite');
                      if (idx !== -1 && parts[idx + 1]) code = parts[idx + 1];
                    } catch {}
                    code = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                    if (!code) throw new Error('Invalid invite');

                    const res = await fetch('/api/invites/accept', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ code })
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({ error: 'Failed to join' }));
                      throw new Error(err.error || 'Failed to join');
                    }
                    const data = await res.json();
                    setShowJoinModal(false);
                    setJoinCode('');
                    router.push(`/server/${data.serverId}`);
                  } catch (e: any) {
                    setJoinError(e?.message || 'Failed to join server');
                  } finally { setJoinLoading(false); }
                }}
              >
                {joinLoading ? 'Joining...' : 'Join Server'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#18181b] border-2 border-skyBlue rounded-2xl p-8 w-96 flex flex-col items-center">
            <h2 className="text-skyBlue font-bold text-xl mb-4 animate-shine">Delete Server</h2>
            <p className="text-white mb-6">Are you sure you want to delete <span className="text-skyBlue font-semibold">{deleteServer.name}</span>?</p>
            {deleteError && <div className="text-red-500 mb-2">{deleteError}</div>}
            <div className="flex space-x-4">
              <button className="px-4 py-2 bg-red-600 text-white rounded" disabled={deleteLoading} onClick={async () => {
                setDeleteLoading(true); setDeleteError('');
                try {
                  const res = await fetch(`/api/servers/${deleteServer.id}`, { method: 'DELETE' });
                  if (!res.ok) throw new Error('Failed to delete server');
                  setServers(servers.filter(s => s.id !== deleteServer.id));
                  setDeleteServer(null);
                } catch (e) {
                  setDeleteError('Failed to delete server');
                } finally { setDeleteLoading(false); }
              }}>Delete</button>
              <button className="px-4 py-2 bg-gray-600 text-white rounded" disabled={deleteLoading} onClick={() => setDeleteServer(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {inviteServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#18181b] border-2 border-skyBlue rounded-2xl p-8 w-96 flex flex-col items-center">
            <h2 className="text-skyBlue font-bold text-xl mb-4 animate-shine">Invite to {inviteServer.name}</h2>
            {inviteLoading ? (
              <div className="text-skyBlue">Loading...</div>
            ) : inviteError ? (
              <div className="text-red-500 mb-2">{inviteError}</div>
            ) : inviteLink ? (
              <div className="w-full bg-[#23232a] text-skyBlue p-2 rounded mb-4 select-all break-all">
                <a href={`/invite/${inviteLink}`} target="_blank" rel="noopener noreferrer" className="underline text-skyBlue">{window.location.origin}/invite/{inviteLink}</a>
              </div>
            ) : (
              <button className="px-4 py-2 bg-skyBlue text-white rounded mb-4" onClick={async () => {
                setInviteLoading(true); setInviteError('');
                try {
                  const res = await fetch('/api/invites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ serverId: inviteServer.id })
                  });
                  if (!res.ok) throw new Error('No invite link available');
                  const data = await res.json();
                  setInviteLink(data.code);
                } catch (e) {
                  setInviteError('No invite link available');
                } finally { setInviteLoading(false); }
              }}>Get Invite Link</button>
            )}
            <button className="px-4 py-2 bg-skyBlue text-white rounded" onClick={() => { setInviteServer(null); setInviteLink(''); setInviteError(''); }}>Close</button>
          </div>
        </div>
      )}

      <style jsx>{`
@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fade-in 0.2s ease; }
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in { animation: none; }
}
`}</style>
    </div>
  );
} 