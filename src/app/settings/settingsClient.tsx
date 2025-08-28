'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Me {
  id: string
  email: string
  username: string
  displayName: string
  avatar: string | null
  banner: string | null
  status: string
  description: string | null
  nitroLevel: number
  isAdmin: boolean
}

export default function SettingsClient() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [active, setActive] = useState<'profile' | 'account' | 'nitro' | 'security'>('profile')

  // form
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [statusText, setStatusText] = useState('online')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push('/login')
      return
    }
    loadMe()
  }, [session, status])

  const loadMe = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/me', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load profile')
      const data: Me = await res.json()
      setMe(data)
      setDisplayName(data.displayName)
      setDescription(data.description || '')
      setStatusText(data.status)
      setAvatar(data.avatar)
      setBanner(data.banner)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          description,
          status: statusText,
          avatar,
          banner,
        })
      })
      if (!res.ok) throw new Error('Failed to save')
      await loadMe()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!me) return null

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="md:col-span-1 bg-gray-900/50 border border-white/10 rounded-xl p-4">
          <nav className="space-y-1">
            {[
              { id: 'profile', label: 'Profile' },
              { id: 'account', label: 'Account' },
              { id: 'nitro', label: 'Nitro' },
              { id: 'security', label: 'Security' },
            ].map(x => (
              <button
                key={x.id}
                onClick={() => setActive(x.id as any)}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${active === x.id ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}
              >
                {x.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <section className="md:col-span-3 space-y-6">
          {active === 'profile' && (
            <div className="bg-gray-900/50 border border-white/10 rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">Profile</h2>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Display name</label>
                <Input className="bg-gray-800 border-gray-700" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Status</label>
                <Input className="bg-gray-800 border-gray-700" value={statusText} onChange={e => setStatusText(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Bio</label>
                <textarea className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-300 mb-2">Avatar URL</label>
                  <Input className="bg-gray-800 border-gray-700" value={avatar || ''} onChange={e => setAvatar(e.target.value || null)} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-300 mb-2">Banner URL</label>
                  <Input className="bg-gray-800 border-gray-700" value={banner || ''} onChange={e => setBanner(e.target.value || null)} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveProfile} disabled={saving} className="bg-purple-500 hover:bg-purple-600">
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}

          {active === 'account' && (
            <div className="bg-gray-900/50 border border-white/10 rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">Account</h2>
              <div className="text-gray-300">Email: {me.email}</div>
              <div className="text-gray-300">Username: @{me.username}</div>
            </div>
          )}

          {active === 'nitro' && (
            <div className="bg-gray-900/50 border border-white/10 rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">Nitro subscription</h2>
              <div className="text-gray-300">Current level: {me.nitroLevel}</div>
              <div className="text-gray-400 text-sm">Nitro is managed by admins. Contact support to upgrade.</div>
            </div>
          )}

          {active === 'security' && (
            <div className="bg-gray-900/50 border border-white/10 rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">Security</h2>
              <div className="text-gray-400 text-sm">Password change and 2FA can be added here. (Coming soon)</div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
