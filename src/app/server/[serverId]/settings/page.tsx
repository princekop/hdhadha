'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  Shield, 
  Crown, 
  Hash, 
  Star, 
  Lock, 
  Palette,
  Edit,
  Trash2,
  Plus,
  Save,
  X,
  Upload,
  Zap
} from 'lucide-react'

interface Server {
  id: string
  name: string
  description: string
  icon: string | null
  banner: string | null
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

interface Member {
  id: string
  name: string
  username: string
  avatar: string | null
  status: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: Date
  mutedUntil?: string | null
  timeoutUntil?: string | null
}

interface Role {
  id: string
  name: string
  color: string
  permissions: string[]
  memberCount: number
}

interface Channel {
  id: string
  name: string
  type: 'text' | 'voice' | 'announcement'
  categoryId: string
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

interface BanItem {
  id: string
  user: { id: string; username: string; displayName: string; avatar: string | null }
  bannedBy: { id: string; username: string; displayName: string } | null
  reason: string | null
  createdAt: string
  expiresAt: string | null
}

export default function ServerSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const serverId = params.serverId as string

  const [server, setServer] = useState<Server | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [bans, setBans] = useState<BanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'members' | 'channels' | 'categories' | 'bans' | 'bytee'>('overview')
  const [moderating, setModerating] = useState<string | null>(null)

  // Server info state
  const [serverName, setServerName] = useState('')
  const [serverDescription, setServerDescription] = useState('')
  const [serverIcon, setServerIcon] = useState<string | null>(null)
  const [serverBanner, setServerBanner] = useState<string | null>(null)
  const [serverTag, setServerTag] = useState('')
  const [byteeLevel, setByteeLevel] = useState(0)
  const [advertisementEnabled, setAdvertisementEnabled] = useState(false)
  const [advertisementText, setAdvertisementText] = useState('')
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Modal states
  const [showIconUpload, setShowIconUpload] = useState(false)
  const [showBannerUpload, setShowBannerUpload] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  
  // Create role form state
  const [roleName, setRoleName] = useState('')
  const [roleColor, setRoleColor] = useState('#99AAB5')
  const [roleIsDefault, setRoleIsDefault] = useState(false)
  const [roleGradient, setRoleGradient] = useState('')
  const [roleImage, setRoleImage] = useState('')
  const [creatingRole, setCreatingRole] = useState(false)

  const resetRoleForm = () => {
    setRoleName('')
    setRoleColor('#99AAB5')
    setRoleIsDefault(false)
    setRoleGradient('')
    setRoleImage('')
    setEditingRole(null)
  }

  const handleCreateRole = async () => {
    if (!roleName.trim()) return
    try {
      setCreatingRole(true)
      const res = await fetch(`/api/servers/${serverId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleName.trim(),
          color: roleColor,
          gradient: roleGradient || null,
          image: roleImage || null,
          isDefault: roleIsDefault,
          permissions: [],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Create role failed', res.status, err)
        return
      }

      const data = await res.json()
      const permissions = Array.isArray(data.permissions)
        ? data.permissions
        : typeof data.permissions === 'string'
          ? (() => { try { return JSON.parse(data.permissions) } catch { return [] } })()
          : []

      const newRole: Role = {
        id: data.id,
        name: data.name,
        color: data.color,
        permissions,
        memberCount: data.memberCount ?? data._count?.members ?? 0,
      }

      setRoles((prev) => [newRole, ...prev])
      setShowRoleModal(false)
      resetRoleForm()
    } catch (e) {
      console.error('Error creating role', e)
    } finally {
      setCreatingRole(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!editingRole) return
    try {
      setCreatingRole(true)
      const res = await fetch(`/api/servers/${serverId}/roles/${editingRole.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleName.trim(),
          color: roleColor,
          gradient: roleGradient || null,
          image: roleImage || null,
          isDefault: roleIsDefault,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Update role failed', res.status, err)
        return
      }
      const data = await res.json()
      setRoles((prev) => prev.map((r) => (r.id === data.id ? { ...r, name: data.name, color: data.color } : r)))
      setShowRoleModal(false)
      resetRoleForm()
    } catch (e) {
      console.error('Error updating role', e)
    } finally {
      setCreatingRole(false)
    }
  }

  const deleteRole = async (roleId: string) => {
    if (!roleId) return
    if (!confirm('Delete this role?')) return
    try {
      const res = await fetch(`/api/servers/${serverId}/roles/${roleId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Failed to delete role', res.status, err)
        setToast({ message: 'Failed to delete role', type: 'error' })
        setTimeout(() => setToast(null), 1000)
        return
      }
      setRoles((prev) => prev.filter((r) => r.id !== roleId))
      setToast({ message: 'Role deleted', type: 'success' })
      setTimeout(() => setToast(null), 1000)
    } catch (e) {
      console.error('Error deleting role', e)
      setToast({ message: 'Error deleting role', type: 'error' })
      setTimeout(() => setToast(null), 1000)
    }
  }

  // Reorder helpers
  const reorderCategories = async (categoryId: string, direction: 'up' | 'down') => {
    const index = categories.findIndex((c) => c.id === categoryId)
    if (index === -1) return
    const swapWith = direction === 'up' ? index - 1 : index + 1
    if (swapWith < 0 || swapWith >= categories.length) return
    const newOrder = [...categories]
    ;[newOrder[index], newOrder[swapWith]] = [newOrder[swapWith], newOrder[index]]
    setCategories(newOrder)
    const payload = { items: newOrder.map((c, i) => ({ id: c.id, position: i })) }
    await fetch(`/api/servers/${serverId}/categories/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  const reorderChannel = async (categoryId: string, channelId: string, direction: 'up' | 'down') => {
    const catIndex = categories.findIndex((c) => c.id === categoryId)
    if (catIndex === -1) return
    const currCat = categories[catIndex]
    const chIndex = currCat.channels.findIndex((ch) => ch.id === channelId)
    if (chIndex === -1) return
    const swapWith = direction === 'up' ? chIndex - 1 : chIndex + 1
    if (swapWith < 0 || swapWith >= currCat.channels.length) return
    const newChannels = [...currCat.channels]
    ;[newChannels[chIndex], newChannels[swapWith]] = [newChannels[swapWith], newChannels[chIndex]]
    const newCats = [...categories]
    newCats[catIndex] = { ...currCat, channels: newChannels }
    setCategories(newCats)
    const items = newCats.flatMap((c) => c.channels.map((ch, i) => ({ id: ch.id, position: i, categoryId: c.id })))
    await fetch(`/api/servers/${serverId}/channels/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
  }

  // Upload states
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user) {
      router.push('/login')
      return
    }

    fetchServerData()
  }, [session, status, router, serverId])

  // Auto-clear success and error messages
  useEffect(() => {
    if (uploadSuccess || uploadError) {
      const timer = setTimeout(() => {
        setUploadSuccess(null)
        setUploadError(null)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [uploadSuccess, uploadError])

  const fetchServerData = async () => {
    try {
      setLoading(true)
      
      // Fetch server info
      const serverResponse = await fetch(`/api/servers/${serverId}`)
      if (serverResponse.ok) {
        const serverData = await serverResponse.json()
        setServer(serverData)
        setServerName(serverData.name)
        setServerDescription(serverData.description || '')
        setServerIcon(serverData.icon)
        setServerBanner(serverData.banner)
        setServerTag(serverData.tag || '')
        setByteeLevel(serverData.byteeLevel || 0)
        setAdvertisementEnabled(!!serverData.advertisementEnabled)
        setAdvertisementText(serverData.advertisementText || '')
      }

      // Fetch members
      const membersResponse = await fetch(`/api/servers/${serverId}/members`)
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        setMembers(membersData)
      }

      // Fetch roles
      const rolesResponse = await fetch(`/api/servers/${serverId}/roles`)
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json()
        setRoles(rolesData)
      }

      // Fetch categories
      const categoriesResponse = await fetch(`/api/servers/${serverId}/categories`)
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json()
        setCategories(categoriesData)
      }

      // Fetch bans (for owners/admins view)
      const bansResponse = await fetch(`/api/servers/${serverId}/bans`)
      if (bansResponse.ok) {
        const bansData = await bansResponse.json()
        setBans(bansData)
      }
    } catch (error) {
      console.error('Error fetching server data:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveServerData = async (data: {
    name: string
    description: string
    icon: string | null
    banner: string | null
    tag: string
    byteeLevel: number
    advertisementEnabled: boolean
    advertisementText: string
  }) => {
    try {
      const response = await fetch(`/api/servers/${serverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        console.log('Server data saved successfully')
        // Refresh server data
        await fetchServerData()
      } else {
        console.error('Failed to save server data:', response.status)
      }
    } catch (error) {
      console.error('Error saving server data:', error)
    }
  }

  const handleSaveServer = async () => {
    try {
      setSaving(true)
      await saveServerData({
        name: serverName,
        description: serverDescription,
        icon: serverIcon,
        banner: serverBanner,
        tag: serverTag,
        byteeLevel,
        advertisementEnabled,
        advertisementText
      })
    } catch (error) {
      console.error('Error saving server:', error)
    } finally {
      setSaving(false)
    }
  }

  const uploadToBlob = async (file: File): Promise<string> => {
    console.log('uploadToBlob called with file:', file.name, file.type, file.size)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      console.log('Sending upload request to /api/upload')
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      console.log('Upload response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Upload failed:', errorData)
        throw new Error(errorData.error || `Upload failed: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Upload response data:', data)
      return data.url
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Icon upload triggered', event.target.files)
    const file = event.target.files?.[0]
    if (!file) {
      console.log('No file selected')
      return
    }

    console.log('File selected:', file.name, file.type, file.size)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file for the server icon.')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Icon file size must be less than 5MB.')
      return
    }

    setUploadingIcon(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      console.log('Starting upload...')
      const iconUrl = await uploadToBlob(file)
      console.log('Upload successful:', iconUrl)
      setServerIcon(iconUrl)
      setUploadSuccess('Server icon uploaded successfully! Refreshing page to show changes everywhere...')
      
      // Auto-save the server data with the new icon
      await saveServerData({
        name: serverName,
        description: serverDescription,
        icon: iconUrl,
        banner: serverBanner,
        tag: serverTag,
        byteeLevel,
        advertisementEnabled,
        advertisementText
      })
      
      // Notify other components about the server update
      window.dispatchEvent(new CustomEvent('serverUpdated', { 
        detail: { serverId, type: 'icon', url: iconUrl } 
      }))
      
      // Force a page refresh to update all components after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
      // Clear the file input
      event.target.value = ''
    } catch (error) {
      console.error('Error uploading icon:', error)
      setUploadError('Failed to upload icon. Please try again.')
    } finally {
      setUploadingIcon(false)
    }
  }

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Banner upload triggered', event.target.files)
    const file = event.target.files?.[0]
    if (!file) {
      console.log('No file selected')
      return
    }

    console.log('File selected:', file.name, file.type, file.size)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file for the server banner.')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Banner file size must be less than 10MB.')
      return
    }

    setUploadingBanner(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      console.log('Starting banner upload...')
      const bannerUrl = await uploadToBlob(file)
      console.log('Banner upload successful:', bannerUrl)
      setServerBanner(bannerUrl)
      setUploadSuccess('Server banner uploaded successfully! Refreshing page to show changes everywhere...')
      
      // Auto-save the server data with the new banner
      await saveServerData({
        name: serverName,
        description: serverDescription,
        icon: serverIcon,
        banner: bannerUrl,
        tag: serverTag,
        byteeLevel,
        advertisementEnabled,
        advertisementText
      })
      
      // Notify other components about the server update
      window.dispatchEvent(new CustomEvent('serverUpdated', { 
        detail: { serverId, type: 'banner', url: bannerUrl } 
      }))
      
      // Force a page refresh to update all components after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
      // Clear the file input
      event.target.value = ''
    } catch (error) {
      console.error('Error uploading banner:', error)
      setUploadError('Failed to upload banner. Please try again.')
    } finally {
      setUploadingBanner(false)
    }
  }

  const handleRemoveIcon = async () => {
    try {
      setServerIcon(null)
      
      // Auto-save the server data without the icon
      await saveServerData({
        name: serverName,
        description: serverDescription,
        icon: null,
        banner: serverBanner,
        tag: serverTag,
        byteeLevel,
        advertisementEnabled,
        advertisementText
      })
      
      setUploadSuccess('Server icon removed successfully! Refreshing page...')
      
      // Force a page refresh to update all components after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Error removing icon:', error)
      setUploadError('Failed to remove icon. Please try again.')
    }
  }

  const handleRemoveBanner = async () => {
    try {
      setServerBanner(null)
      
      // Auto-save the server data without the banner
      await saveServerData({
        name: serverName,
        description: serverDescription,
        icon: serverIcon,
        banner: null,
        tag: serverTag,
        byteeLevel,
        advertisementEnabled,
        advertisementText
      })
      
      setUploadSuccess('Server banner removed successfully! Refreshing page...')
      
      // Force a page refresh to update all components after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Error removing banner:', error)
      setUploadError('Failed to remove banner. Please try again.')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!server) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Server not found</div>
      </div>
    )
  }

  const isOwner = server.ownerId === (session?.user as any)?.id
  const isAdmin = members.find(m => m.id === (session?.user as any)?.id)?.role === 'admin'
  const isGlobalAdmin = !!(session?.user as any)?.isAdmin

  // Moderation helpers (owner or global admin)
  const canModerate = isOwner || isGlobalAdmin

  const muteMember = async (memberId: string, minutes: number) => {
    if (!canModerate) return
    try {
      setModerating(memberId)
      await fetch(`/api/servers/${serverId}/members/${memberId}/mute`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: minutes })
      })
      await fetchServerData()
    } finally {
      setModerating(null)
    }
  }

  const timeoutMember = async (memberId: string, minutes: number) => {
    if (!canModerate) return
    try {
      setModerating(memberId)
      await fetch(`/api/servers/${serverId}/members/${memberId}/timeout`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: minutes })
      })
      await fetchServerData()
    } finally {
      setModerating(null)
    }
  }

  const banMember = async (memberId: string) => {
    if (!canModerate) return
    if (!confirm('Ban this user from the server?')) return
    try {
      setModerating(memberId)
      await fetch(`/api/servers/${serverId}/members/${memberId}/ban`, { method: 'POST' })
      await fetchServerData()
    } finally {
      setModerating(null)
    }
  }

  const unbanUser = async (userId: string) => {
    if (!canModerate) return
    try {
      setModerating(userId)
      const res = await fetch(`/api/servers/${serverId}/members/${userId}/ban`, { method: 'DELETE' })
      if (!res.ok) {
        console.error('Failed to unban:', res.status)
      }
      await fetchServerData()
    } finally {
      setModerating(null)
    }
  }

  const deleteCategory = async (categoryId: string, name?: string) => {
    if (!categoryId) return
    try {
      const res = await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Failed to delete category', res.status, err)
        setToast({ message: 'Failed to delete category', type: 'error' })
        setTimeout(() => setToast(null), 1000)
        return
      }
      setCategories((prev: Category[]) => prev.filter((c: Category) => c.id !== categoryId))
      setToast({ message: `Deleted ${name || 'category'}` , type: 'success' })
      setTimeout(() => setToast(null), 1000)
    } catch (e) {
      console.error('Error deleting category', e)
      setToast({ message: 'Error deleting category', type: 'error' })
      setTimeout(() => setToast(null), 1000)
    }
  }

  const deleteChannel = async (channelId: string, name?: string) => {
    if (!channelId) return
    try {
      const res = await fetch(`/api/channels/${channelId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Failed to delete channel', res.status, err)
        setToast({ message: 'Failed to delete channel', type: 'error' })
        setTimeout(() => setToast(null), 1000)
        return
      }
      setCategories((prev: Category[]) => prev.map((cat: Category) => ({
        ...cat,
        channels: cat.channels.filter((ch: Channel) => ch.id !== channelId)
      })))
      setToast({ message: `Deleted ${name || 'channel'}` , type: 'success' })
      setTimeout(() => setToast(null), 1000)
    } catch (e) {
      console.error('Error deleting channel', e)
      setToast({ message: 'Error deleting channel', type: 'error' })
      setTimeout(() => setToast(null), 1000)
    }
  }

  if (!isOwner && !isAdmin && !isGlobalAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Access denied</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md border shadow-lg transition-opacity ${
            toast.type === 'success'
              ? 'bg-green-600/20 border-green-500/40 text-green-200'
              : 'bg-red-600/20 border-red-500/40 text-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}
      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <Settings className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Server Settings</h1>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => router.push(`/dash/${(session?.user as any)?.id}`)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-white/10"
              >
                View in Server List
              </Button>
              <Button
                onClick={handleSaveServer}
                disabled={saving}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-900/50 rounded-lg p-1 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: Settings },
            { id: 'roles', label: 'Roles', icon: Shield },
            { id: 'members', label: 'Members', icon: Users },
            { id: 'channels', label: 'Channels', icon: Hash },
            { id: 'categories', label: 'Categories', icon: Crown },
            { id: 'bans', label: 'Bans', icon: Lock },
            { id: 'bytee', label: 'Bytee', icon: Zap }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Server Info */}
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold mb-6">Server Information</h2>
              
              {uploadError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  {uploadError}
                </div>
              )}
             {uploadSuccess && (
                <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm">
                  {uploadSuccess}
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Basic Info */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Server Name
                    </label>
                    <Input
                      type="text"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      value={serverDescription}
                      onChange={(e) => setServerDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 resize-none"
                      placeholder="Describe your server..."
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Server Tag
                    </label>
                    <Input
                      type="text"
                      value={serverTag}
                      onChange={(e) => setServerTag(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="e.g., DISCORD"
                      maxLength={5}
                    />
                  </div>
                </div>

                {/* Right Column - Media */}
                <div className="space-y-6">
                  {/* Server Icon */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Server Icon
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center border border-white/20">
                        {serverIcon ? (
                          <img
                            src={serverIcon}
                            alt="Server Icon"
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {serverName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleIconUpload}
                          className="hidden"
                          disabled={uploadingIcon}
                          id="icon-upload"
                        />
                        <Button 
                          size="sm" 
                          className="bg-purple-500 hover:bg-purple-600"
                          disabled={uploadingIcon}
                          onClick={() => document.getElementById('icon-upload')?.click()}
                        >
                          {uploadingIcon ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-1" />
                              Upload
                            </>
                          )}
                        </Button>
                        {serverIcon && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleRemoveIcon}
                            disabled={uploadingIcon}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Server Banner */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Server Banner
                    </label>
                    <div className="space-y-2">
                      <div className="h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg overflow-hidden">
                        {serverBanner && (
                          <img
                            src={serverBanner}
                            alt="Server Banner"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          className="hidden"
                          disabled={uploadingBanner}
                          id="banner-upload"
                        />
                        <Button 
                          size="sm" 
                          className="bg-purple-500 hover:bg-purple-600"
                          disabled={uploadingBanner}
                          onClick={() => document.getElementById('banner-upload')?.click()}
                        >
                          {uploadingBanner ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-1" />
                              Upload
                            </>
                          )}
                        </Button>
                        {serverBanner && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleRemoveBanner}
                            disabled={uploadingBanner}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Server Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <div className="flex items-center space-x-3">
                  <Users className="h-8 w-8 text-purple-400" />
                  <div>
                    <p className="text-2xl font-bold">{members.length}</p>
                    <p className="text-gray-400 text-sm">Members</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <div className="flex items-center space-x-3">
                  <Hash className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold">
                      {categories.reduce((acc, cat) => acc + cat.channels.length, 0)}
                    </p>
                    <p className="text-gray-400 text-sm">Channels</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <div className="flex items-center space-x-3">
                  <Crown className="h-8 w-8 text-yellow-400" />
                  <div>
                    <p className="text-2xl font-bold">{categories.length}</p>
                    <p className="text-gray-400 text-sm">Categories</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <div className="flex items-center space-x-3">
                  <Zap className="h-8 w-8 text-green-400" />
                  <div>
                    <p className="text-2xl font-bold">{byteeLevel}</p>
                    <p className="text-gray-400 text-sm">Bytee Level</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bans Tab */}
        {activeTab === 'bans' && (
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Banned Users</h2>
            </div>
            {bans.length === 0 ? (
              <div className="text-gray-400">No bans.</div>
            ) : (
              <div className="space-y-3">
                {bans.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700">
                        {b.user.avatar ? (
                          <img src={b.user.avatar} alt={b.user.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm text-white/70">
                            {b.user.displayName?.charAt(0) || b.user.username?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{b.user.displayName || b.user.username}</div>
                        <div className="text-xs text-gray-400">
                          Banned {new Date(b.createdAt).toLocaleString()} {b.expiresAt ? `(until ${new Date(b.expiresAt).toLocaleString()})` : ''}
                          {b.reason ? ` • Reason: ${b.reason}` : ''}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Button size="sm" variant="outline" disabled={moderating === b.user.id || !canModerate} onClick={() => unbanUser(b.user.id)}>
                        {moderating === b.user.id ? 'Unbanning...' : 'Unban'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Server Roles</h2>
              <Button
                onClick={() => setShowRoleModal(true)}
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </div>

            <div className="space-y-4">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-white/10"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    <div>
                      <h3 className="font-medium">{role.name}</h3>
                      <p className="text-gray-400 text-sm">{role.memberCount} members</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingRole(role)
                        setRoleName(role.name)
                        setRoleColor(role.color)
                        setRoleGradient((role as any).gradient || '')
                        setRoleImage((role as any).image || '')
                        setRoleIsDefault(!!(role as any).isDefault)
                        setShowRoleModal(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteRole(role.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create/Edit Role Modal */}
        {showRoleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={() => setShowRoleModal(false)} />
            <div className="relative z-10 w-full max-w-lg bg-gray-900 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingRole ? 'Edit Role' : 'Create Role'}</h3>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="p-2 hover:bg-white/10 rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Role Name</label>
                  <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g., Moderator" className="bg-gray-800 border-gray-700" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Color</label>
                  <Input type="color" value={roleColor} onChange={(e) => setRoleColor(e.target.value)} className="bg-gray-800 border-gray-700 h-10 p-1" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Gradient (CSS background)</label>
                  <Input value={roleGradient} onChange={(e) => setRoleGradient(e.target.value)} placeholder="linear-gradient(90deg, #a855f7, #3b82f6)" className="bg-gray-800 border-gray-700" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Role Image URL</label>
                  <Input value={roleImage} onChange={(e) => setRoleImage(e.target.value)} placeholder="https://..." className="bg-gray-800 border-gray-700" />
                </div>
                <div className="flex items-center space-x-2">
                  <input id="isDefaultRole" type="checkbox" checked={roleIsDefault} onChange={(e) => setRoleIsDefault(e.target.checked)} />
                  <label htmlFor="isDefaultRole" className="text-sm text-gray-300">Set as default role</label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <Button variant="outline" className="border-gray-600" onClick={() => setShowRoleModal(false)}>Cancel</Button>
                <Button onClick={() => (editingRole ? handleUpdateRole() : handleCreateRole())} disabled={creatingRole || !roleName.trim()} className="bg-purple-500 hover:bg-purple-600">
                  {creatingRole ? (editingRole ? 'Saving...' : 'Creating...') : (editingRole ? 'Save' : 'Create')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-6">Server Members</h2>
            
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-white/10"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt="Avatar"
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span className="text-white font-semibold text-sm">
                            {member.username.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${
                        member.status === 'online' ? 'bg-green-500' :
                        member.status === 'idle' ? 'bg-yellow-500' :
                        member.status === 'dnd' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium">{member.name}</h3>
                      <p className="text-gray-400 text-sm">@{member.username}</p>
                      <div className="flex gap-2 mt-1 text-xs">
                        {member.mutedUntil && (
                          <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Muted</span>
                        )}
                        {member.timeoutUntil && (
                          <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">Timeout</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {member.role === 'owner' && <Crown className="h-4 w-4 text-yellow-400" />}
                    {member.role === 'admin' && <Shield className="h-4 w-4 text-blue-400" />}
                    <span className="text-gray-400 text-sm capitalize">{member.role}</span>
                    {canModerate && member.id !== (session?.user as any)?.id && member.role !== 'owner' && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" className="bg-white/10" disabled={moderating===member.id} onClick={() => muteMember(member.id, member.mutedUntil ? 0 : 10)}>
                          {moderating===member.id ? '...' : member.mutedUntil ? 'Unmute' : 'Mute 10m'}
                        </Button>
                        <Button size="sm" variant="secondary" className="bg-white/10" disabled={moderating===member.id} onClick={() => timeoutMember(member.id, member.timeoutUntil ? 0 : 60)}>
                          {moderating===member.id ? '...' : member.timeoutUntil ? 'Clear Timeout' : 'Timeout 60m'}
                        </Button>
                        <Button size="sm" variant="destructive" className="bg-red-500/20 text-red-200 border border-red-500/30" disabled={moderating===member.id} onClick={() => banMember(member.id)}>
                          {moderating===member.id ? '...' : 'Ban'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Channels Tab */}
        {activeTab === 'channels' && (
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Channels</h2>
              <Button
                onClick={() => setShowChannelModal(true)}
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Channel
              </Button>
            </div>

            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.id} className="space-y-2">
                  <h3 className="text-lg font-medium text-gray-300">{category.name}</h3>
                  {category.channels.map((channel, chIdx) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-white/10 ml-4"
                    >
                      <div className="flex items-center space-x-3">
                        <Hash className="h-5 w-5 text-gray-400" />
                        <div>
                          <h4 className="font-medium">{channel.name}</h4>
                          <p className="text-gray-400 text-sm">
                            {channel.isPrivate ? 'Private' : 'Public'} • {channel.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => reorderChannel(category.id, channel.id, 'up')} disabled={chIdx === 0}>↑</Button>
                        <Button size="sm" variant="outline" onClick={() => reorderChannel(category.id, channel.id, 'down')} disabled={chIdx === category.channels.length - 1}>↓</Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingChannel(channel)
                            setShowChannelModal(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteChannel(channel.id, channel.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Categories</h2>
              <Button
                onClick={() => setShowCategoryModal(true)}
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Category
              </Button>
            </div>

            <div className="space-y-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-white/10"
                >
                  <div className="flex items-center space-x-3">
                    <Crown className="h-5 w-5 text-gray-400" />
                    <div>
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="text-gray-400 text-sm">{category.channels.length} channels</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => reorderCategories(category.id, 'up')}>↑</Button>
                    <Button size="sm" variant="outline" onClick={() => reorderCategories(category.id, 'down')}>↓</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingCategory(category)
                        setShowCategoryModal(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteCategory(category.id, category.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bytee Tab */}
        {activeTab === 'bytee' && (
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-6">Bytee Server Boost</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-500/30">
                <div className="flex items-center space-x-3 mb-4">
                  <Zap className="h-8 w-8 text-yellow-400" />
                  <div>
                    <h3 className="text-lg font-semibold">Current Level</h3>
                    <p className="text-3xl font-bold text-yellow-400">{byteeLevel}</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm">
                  Boost your server to unlock exclusive features and perks
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Benefits</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Custom server banner</li>
                  <li>• Higher quality audio</li>
                  <li>• More emoji slots</li>
                  <li>• Custom role colors</li>
                  <li>• Server analytics</li>
                </ul>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Boost Server</h3>
                <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                  <Zap className="h-4 w-4 mr-2" />
                  Boost Now
                </Button>
                <p className="text-gray-400 text-xs mt-2 text-center">
                  Starting at $4.99/month
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 