'use client';

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Upload } from 'lucide-react'
import ProfileCard from '@/components/ProfileCard'
import LandscapeProfileWidget from '@/components/LandscapeProfileWidget'
import { computeEffectivePresence, presenceColorClass } from '@/lib/presence'
import type { Decoration } from '@/lib/decorations'
import Avatar from '../../../components/Avatar'
import ProfileVideoEffect from '@/components/ProfileVideoEffect'

interface UserProfile {
  id: string
  username: string
  displayName: string
  avatar: string | null
  banner: string | null
  status: string
  description: string | null
  isAdmin: boolean
  email: string
  avatarDecoration?: string | null
  createdAt?: string
}

function ProfileEditPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [decorations, setDecorations] = useState<Decoration[]>([])
  // Profile Video Effect settings
  const [enableVideoEffect, setEnableVideoEffect] = useState<boolean>(false)
  const [videoOpacity, setVideoOpacity] = useState<number>(60)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user) {
      router.push('/login')
      return
    }

    fetchProfile()
    fetchDecorations()
  }, [session, status, router])

  // Load profile video effect settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem('db_profile_video_effect')
      if (raw) {
        const obj = JSON.parse(raw)
        if (typeof obj.enabled === 'boolean') setEnableVideoEffect(obj.enabled)
        if (typeof obj.opacity === 'number') setVideoOpacity(obj.opacity)
      }
    } catch {}
  }, [])

  // Persist profile video effect settings
  useEffect(() => {
    try {
      localStorage.setItem('db_profile_video_effect', JSON.stringify({ enabled: enableVideoEffect, opacity: videoOpacity }))
    } catch {}
  }, [enableVideoEffect, videoOpacity])

  const fetchProfile = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      const response = await fetch('/api/users/' + (session.user as any).id + '/profile')
      if (response.ok) {
        const userData = await response.json()
        setProfile(userData)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDecorations = async () => {
    try {
      const res = await fetch('/api/decorations')
      if (!res.ok) return
      const data = await res.json()
      // items: { slug, name }
      setDecorations(data.items || [])
    } catch (e) {
      // ignore
    }
  }

  const handleSave = async () => {
    if (!profile) return

    try {
      setSaving(true)
      const response = await fetch('/api/users/' + profile.id + '/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: profile.displayName,
          status: profile.status,
          description: profile.description,
          avatar: profile.avatar,
          banner: profile.banner,
          avatarDecoration: profile.avatarDecoration ?? null,
        }),
      })

             if (response.ok) {
         router.back()
       } else {
        console.error('Failed to update profile')
      }
    } catch (error) {
      console.error('Profile update error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const { url } = await response.json()
        setProfile(prev => prev ? { ...prev, avatar: url } : null)
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
    }
  }

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const { url } = await response.json()
        setProfile(prev => prev ? { ...prev, banner: url } : null)
      }
    } catch (error) {
      console.error('Banner upload error:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Profile not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold">Edit Profile</h1>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Admin Landscape Profile Preview */}
        {profile.isAdmin && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-center">Landscape Profile Preview</h2>
            <div className="flex justify-center">
              <div className="w-full max-w-xl">
                <LandscapeProfileWidget
                  avatarUrl={profile.avatar}
                  bannerUrl={profile.banner}
                  decorationSlug={profile.avatarDecoration}
                  displayName={profile.displayName}
                  username={profile.username}
                  status={profile.status as any}
                  description={profile.description}
                  createdAt={profile.createdAt}
                  onStatusChange={(s) => setProfile(prev => prev ? { ...prev, status: s } : prev)}
                />
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Avatar and Banner */}
          <div className="lg:col-span-1 space-y-6">
            {/* Avatar Section */}
            <div id="banner-section" className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">Profile Picture</h3>
              <div className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <div className="relative w-36 h-36 rounded-full overflow-visible">
                    <Avatar
                      src={profile.avatar || undefined}
                      alt="Avatar"
                      size={144}
                      decorationSlug={profile.avatarDecoration ?? undefined}
                    />
                  </div>
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Upload className="h-6 w-6 text-white" />
                  </label>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <span className="text-purple-400 hover:text-purple-300 text-sm">
                    Upload new picture
                  </span>
                </label>
                {/* Decoration picker */}
                {decorations.length > 0 && (
                  <div className="w-full mt-4">
                    <h4 className="text-sm text-gray-300 mb-2">Avatar Decoration</h4>
                    <div className="grid grid-cols-4 gap-3">
                      <button
                        className={'rounded-lg border px-2 py-1 text-sm ' + (!profile.avatarDecoration ? 'border-purple-500 text-purple-300' : 'border-white/20 text-gray-300 hover:border-white/40')}
                        onClick={() => setProfile(prev => prev ? { ...prev, avatarDecoration: null } : prev)}
                      >
                        None
                      </button>
                      {decorations.map((d) => (
                        <button
                          key={d.slug}
                          className={'relative h-14 rounded-lg border overflow-hidden ' + (profile.avatarDecoration === d.slug ? 'border-purple-500' : 'border-white/10 hover:border-white/30')}
                          onClick={() => setProfile(prev => prev ? { ...prev, avatarDecoration: d.slug } : prev)}
                          title={d.name}
                        >
                          <img
                            src={'/api/decorations/' + d.slug + '/image'}
                            alt={d.name}
                            className="absolute inset-0 w-full h-full object-contain"
                            draggable={false}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Banner Section */}
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">Banner Image</h3>
              <div className="space-y-4">
                <div className="relative">
                  <div className="h-32 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg overflow-hidden relative select-none" onContextMenu={(e) => e.preventDefault()}>
                    {profile.banner && (
                      <img 
                        src={profile.banner} 
                        alt="Banner" 
                        className="w-full h-full object-cover"
                      />
                    )}
                    {/* Profile video effect overlay */}
                    {enableVideoEffect && (
                      <ProfileVideoEffect
                        src={"/profile%20effect/profile-1.mp4"}
                        opacity={videoOpacity}
                        playing={true}
                        className="absolute inset-0 w-full h-full block"
                      />
                    )}
                  </div>
                  <label className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 transition-colors rounded-lg px-3 py-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                    <span className="text-white text-xs flex items-center space-x-1">
                      <Upload className="h-3 w-3" />
                      <span>Upload</span>
                    </span>
                  </label>
                </div>
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                  <span className="text-purple-400 hover:text-purple-300 text-sm">
                    Upload new banner
                  </span>
                </label>
                {/* Video effect controls */}
                <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-300">Enable Profile Video Effect</label>
                    <input
                      type="checkbox"
                      checked={enableVideoEffect}
                      onChange={(e) => setEnableVideoEffect(e.target.checked)}
                    />
                  </div>
                  <div className="opacity-100">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-400">Effect Opacity</label>
                      <span className="text-xs text-gray-400 font-semibold">{videoOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={videoOpacity}
                      onChange={(e) => setVideoOpacity(Number(e.target.value))}
                      className="w-full accent-purple-500"
                      disabled={!enableVideoEffect}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">Video overlay is drawn to a canvas to deter copying. Right-click is disabled on the preview.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-6">Profile Information</h3>
              
              <div className="space-y-6">
                {/* Username */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Username
                  </label>
                  <Input
                    type="text"
                    value={profile.username}
                    disabled
                    className="bg-gray-800 border-gray-600 text-gray-400"
                  />
                  <p className="text-gray-500 text-xs mt-1">Username cannot be changed</p>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Display Name
                  </label>
                  <Input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, displayName: e.target.value } : null)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                    placeholder="Enter your display name"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Status
                  </label>
                  <select
                    value={profile.status}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, status: e.target.value } : null)}
                    className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2"
                  >
                    <option value="online">Online</option>
                    <option value="idle">Idle</option>
                    <option value="dnd">Do Not Disturb</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    About Me
                  </label>
                  <Textarea
                    value={profile.description || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, description: e.target.value } : null)}
                    rows={4}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-gray-800 border-gray-600 text-gray-400"
                  />
                  <p className="text-gray-500 text-xs mt-1">Email cannot be changed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileEditPage;