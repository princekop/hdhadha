'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AdminUser = {
  id: string
  email: string
  username: string
  displayName: string
  avatar?: string | null
  isAdmin: boolean
  nitroLevel: number
  createdAt: string
}

type AdminServer = {
  id: string
  name: string
  tag?: string | null
  byteeLevel: number
  members: number
  owner: { id: string; username: string; displayName: string }
  createdAt: string
}

export default function AdminClient({ users, servers }: { users: AdminUser[]; servers: AdminServer[] }) {
  const [u, setU] = useState(users)
  const [s, setS] = useState(servers)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tab, setTab] = useState<'users' | 'servers'>('users')
  const [userQuery, setUserQuery] = useState('')
  const [serverQuery, setServerQuery] = useState('')
  const [userSort, setUserSort] = useState<'created_desc' | 'created_asc' | 'nitro_desc'>('created_desc')
  const [serverSort, setServerSort] = useState<'created_desc' | 'created_asc' | 'members_desc' | 'boost_desc'>('created_desc')
  const [userPage, setUserPage] = useState(1)
  const [serverPage, setServerPage] = useState(1)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectedServers, setSelectedServers] = useState<Set<string>>(new Set())
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null)
  const [detailServer, setDetailServer] = useState<AdminServer | null>(null)
  const [bulkUserNitro, setBulkUserNitro] = useState<number | ''>('')
  const [bulkServerBoost, setBulkServerBoost] = useState<number | ''>('')
  const pageSize = 10
  const router = useRouter()
  const searchParams = useSearchParams()

  // Load initial state from URL
  useEffect(() => {
    const t = (searchParams.get('tab') as 'users' | 'servers') || 'users'
    const uq = searchParams.get('uq') || ''
    const sq = searchParams.get('sq') || ''
    const us = (searchParams.get('usort') as typeof userSort) || 'created_desc'
    const ss = (searchParams.get('ssort') as typeof serverSort) || 'created_desc'
    setTab(t)
    setUserQuery(uq)
    setServerQuery(sq)
    setUserSort(us)
    setServerSort(ss)
    const up = parseInt(searchParams.get('up') || '1', 10)
    const sp = parseInt(searchParams.get('sp') || '1', 10)
    setUserPage(Number.isFinite(up) && up > 0 ? up : 1)
    setServerPage(Number.isFinite(sp) && sp > 0 ? sp : 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist state to URL (shallow)
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('tab', tab)
    if (userQuery) params.set('uq', userQuery); else params.delete('uq')
    if (serverQuery) params.set('sq', serverQuery); else params.delete('sq')
    params.set('usort', userSort)
    params.set('ssort', serverSort)
    params.set('up', String(userPage))
    params.set('sp', String(serverPage))
    router.replace(`?${params.toString()}`)
  }, [tab, userQuery, serverQuery, userSort, serverSort, userPage, serverPage, router])

  // Derived lists
  const usersView = useMemo(() => {
    let list = [...u]
    const q = userQuery.trim().toLowerCase()
    if (q) list = list.filter(user =>
      (user.displayName || '').toLowerCase().includes(q) ||
      (user.username || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q)
    )
    list.sort((a, b) => {
      if (userSort === 'created_desc') return (b.createdAt > a.createdAt) ? 1 : -1
      if (userSort === 'created_asc') return (a.createdAt > b.createdAt) ? 1 : -1
      if (userSort === 'nitro_desc') return (b.nitroLevel ?? 0) - (a.nitroLevel ?? 0)
      return 0
    })
    const total = list.length
    const start = (userPage - 1) * pageSize
    const page = list.slice(start, start + pageSize)
    return { page, total }
  }, [u, userQuery, userSort, userPage])

  const serversView = useMemo(() => {
    let list = [...s]
    const q = serverQuery.trim().toLowerCase()
    if (q) list = list.filter(srv =>
      (srv.name || '').toLowerCase().includes(q) ||
      ((srv.tag || '')).toLowerCase().includes(q)
    )
    list.sort((a, b) => {
      if (serverSort === 'created_desc') return (b.createdAt > a.createdAt) ? 1 : -1
      if (serverSort === 'created_asc') return (a.createdAt > b.createdAt) ? 1 : -1
      if (serverSort === 'members_desc') return (b.members ?? 0) - (a.members ?? 0)
      if (serverSort === 'boost_desc') return (b.byteeLevel ?? 0) - (a.byteeLevel ?? 0)
      return 0
    })
    const total = list.length
    const start = (serverPage - 1) * pageSize
    const page = list.slice(start, start + pageSize)
    return { page, total }
  }, [s, serverQuery, serverSort, serverPage])

  const kpis = useMemo(() => {
    const totalUsers = u.length
    const adminCount = u.filter(x => x.isAdmin).length
    const avgNitro = totalUsers ? (u.reduce((acc, x) => acc + (x.nitroLevel ?? 0), 0) / totalUsers) : 0
    const totalServers = s.length
    const totalBoost = s.reduce((acc, x) => acc + (x.byteeLevel ?? 0), 0)
    const totalMembers = s.reduce((acc, x) => acc + (x.members ?? 0), 0)
    return { totalUsers, adminCount, avgNitro, totalServers, totalBoost, totalMembers }
  }, [u, s])

  const toggleUserSelect = (id: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Admin server management actions
  const createServerPrompt = async () => {
    try {
      const name = prompt('Server name:')?.trim()
      if (!name) return
      const ownerId = prompt('Owner userId:')?.trim()
      if (!ownerId) return
      const description = prompt('Description (optional):') || undefined
      const tag = prompt('Tag (optional):') || undefined
      setSaving('create-server')
      setError(null)
      const res = await fetch('/api/admin/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ownerId, description, tag }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed (${res.status})`)
      }
      // Refresh list
      const list = await fetch('/api/admin/servers').then(r => r.json())
      setS(list)
      setSuccess('Server created')
    } catch (e: any) {
      setError(e.message || 'Failed to create server')
    } finally {
      setSaving(null)
      setTimeout(() => { setSuccess(null); setError(null) }, 3000)
    }
  }

  const advertiseServerPrompt = async (serverId: string) => {
    try {
      const enabledStr = prompt('Enable advertisement? (yes/no)')?.trim().toLowerCase()
      if (!enabledStr) return
      const advertisementEnabled = enabledStr === 'yes' || enabledStr === 'y'
      const advertisementText = prompt('Advertisement text (optional):') || undefined
      setSaving(`advertise-${serverId}`)
      setError(null)
      const res = await fetch(`/api/admin/servers/${serverId}/advertise`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advertisementEnabled, advertisementText })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed (${res.status})`)
      }
      setSuccess('Advertisement updated')
    } catch (e: any) {
      setError(e.message || 'Failed to update advertisement')
    } finally {
      setSaving(null)
      setTimeout(() => { setSuccess(null); setError(null) }, 3000)
    }
  }

  const deleteServer = async (serverId: string) => {
    try {
      if (!confirm('Delete this server? This cannot be undone.')) return
      setSaving(`delete-${serverId}`)
      setError(null)
      const res = await fetch(`/api/admin/servers/${serverId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed (${res.status})`)
      }
      setS(prev => prev.filter(x => x.id !== serverId))
      setSuccess('Server deleted')
    } catch (e: any) {
      setError(e.message || 'Failed to delete server')
    } finally {
      setSaving(null)
      setTimeout(() => { setSuccess(null); setError(null) }, 3000)
    }
  }
  const toggleServerSelect = (id: string) => {
    setSelectedServers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const selectAllUsersOnPage = () => {
    const ids = usersView.page.map(x => x.id)
    setSelectedUsers(prev => {
      const next = new Set(prev)
      let allSelected = ids.every(id => next.has(id))
      if (allSelected) ids.forEach(id => next.delete(id)); else ids.forEach(id => next.add(id))
      return next
    })
  }
  const selectAllServersOnPage = () => {
    const ids = serversView.page.map(x => x.id)
    setSelectedServers(prev => {
      const next = new Set(prev)
      let allSelected = ids.every(id => next.has(id))
      if (allSelected) ids.forEach(id => next.delete(id)); else ids.forEach(id => next.add(id))
      return next
    })
  }

  const applyBulkNitro = async () => {
    if (bulkUserNitro === '' || bulkUserNitro < 0) return
    if (!confirm(`Set Nitro=${bulkUserNitro} for ${selectedUsers.size} users?`)) return
    setSaving('bulk-nitro')
    setError(null)
    const ids = Array.from(selectedUsers)
    const results = await Promise.allSettled(ids.map(id => setNitro(id, Number(bulkUserNitro))))
    const rejected = results.filter(r => r.status === 'rejected')
    setSaving(null)
    setSuccess(`Updated ${ids.length - rejected.length}/${ids.length} users`)
    setTimeout(() => setSuccess(null), 3000)
  }

  const applyBulkBoost = async () => {
    if (bulkServerBoost === '' || bulkServerBoost < 0) return
    if (!confirm(`Set Boost=${bulkServerBoost} for ${selectedServers.size} servers?`)) return
    setSaving('bulk-boost')
    setError(null)
    const ids = Array.from(selectedServers)
    const results = await Promise.allSettled(ids.map(id => setBoost(id, Number(bulkServerBoost))))
    const rejected = results.filter(r => r.status === 'rejected')
    setSaving(null)
    setSuccess(`Updated ${ids.length - rejected.length}/${ids.length} servers`)
    setTimeout(() => setSuccess(null), 3000)
  }

  const setNitro = async (userId: string, nitroLevel: number) => {
    try {
      setSaving(`nitro-${userId}`)
      setError(null)
      if (!Number.isFinite(nitroLevel) || nitroLevel < 0) throw new Error('Invalid nitro level')
      if (!confirm(`Set Nitro level to ${nitroLevel}?`)) return
      const res = await fetch(`/api/admin/users/${userId}/nitro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nitroLevel })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed (${res.status})`)
      }
      setU(prev => prev.map(x => x.id === userId ? { ...x, nitroLevel } : x))
      setSuccess('Nitro updated')
    } catch (e: any) {
      setError(e.message || 'Failed to update nitro')
    } finally {
      setSaving(null)
      setTimeout(() => { setSuccess(null); setError(null) }, 3000)
    }
  }

  const setBoost = async (serverId: string, byteeLevel: number) => {
    try {
      setSaving(`boost-${serverId}`)
      setError(null)
      if (!Number.isFinite(byteeLevel) || byteeLevel < 0) throw new Error('Invalid boost level')
      if (!confirm(`Set Boost level to ${byteeLevel}?`)) return
      const res = await fetch(`/api/admin/servers/${serverId}/boost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ byteeLevel })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed (${res.status})`)
      }
      setS(prev => prev.map(x => x.id === serverId ? { ...x, byteeLevel } : x))
      setSuccess('Boost updated')
    } catch (e: any) {
      setError(e.message || 'Failed to update boost')
    } finally {
      setSaving(null)
      setTimeout(() => { setSuccess(null); setError(null) }, 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a12] via-[#07070c] to-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_1px_8px_rgba(168,85,247,0.25)]">Admin Dashboard</h1>
          <div className="inline-flex rounded-[15px] overflow-hidden backdrop-blur-xl ring-1 ring-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <button onClick={() => setTab('users')} className={`px-4 py-2 text-sm transition-colors ${tab==='users' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/10'}`}>Users</button>
            <button onClick={() => setTab('servers')} className={`px-4 py-2 text-sm transition-colors ${tab==='servers' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/10'}`}>Servers</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-[15px] backdrop-blur-xl ring-1 ring-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform hover:translate-y-[-1px]">
            <div className="text-gray-400 text-xs">Users</div>
            <div className="text-2xl font-semibold">{kpis.totalUsers}</div>
            <div className="text-xs text-yellow-300/90">Admins: {kpis.adminCount}</div>
          </div>
          <div className="p-4 rounded-[15px] backdrop-blur-xl ring-1 ring-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform hover:translate-y-[-1px]">
            <div className="text-gray-400 text-xs">Avg Nitro</div>
            <div className="text-2xl font-semibold">{kpis.avgNitro.toFixed(1)}</div>
          </div>
          <div className="p-4 rounded-[15px] backdrop-blur-xl ring-1 ring-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform hover:translate-y-[-1px]">
            <div className="text-gray-400 text-xs">Servers</div>
            <div className="text-2xl font-semibold">{kpis.totalServers}</div>
            <div className="text-xs text-purple-300/90">Boost sum: {kpis.totalBoost} • Members: {kpis.totalMembers}</div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded text-green-300">{success}</div>
        )}

        {tab === 'users' && (
          <div className="rounded-[15px] p-6 backdrop-blur-xl ring-1 ring-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Users</h2>
              <div className="flex items-center gap-2">
                <input
                  placeholder="Search by name or email"
                  className="w-64 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                  value={userQuery}
                  onChange={(e) => { setUserQuery(e.target.value); setUserPage(1) }}
                />
                <select
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                  value={userSort}
                  onChange={(e) => setUserSort(e.target.value as any)}
                >
                  <option value="created_desc">Newest</option>
                  <option value="created_asc">Oldest</option>
                  <option value="nitro_desc">Nitro high → low</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2 text-sm text-gray-400">
              <button onClick={selectAllUsersOnPage} className="hover:underline">{usersView.page.every(u => selectedUsers.has(u.id)) && usersView.page.length > 0 ? 'Unselect all on page' : 'Select all on page'}</button>
              <div>{selectedUsers.size} selected</div>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-auto pr-2">
              {usersView.page.length === 0 && (
                <div className="text-center text-gray-400 py-8">No users found.</div>
              )}
              {usersView.page.map(user => (
                <div key={user.id} className="p-4 rounded-[15px] backdrop-blur-xl ring-1 ring-white/10 bg-white/5 shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1" checked={selectedUsers.has(user.id)} onChange={() => toggleUserSelect(user.id)} />
                      <div>
                        <button onClick={() => setDetailUser(user)} className="font-medium hover:underline">{user.displayName}</button> <span className="text-gray-400">@{user.username}</span> {user.isAdmin && (<span className="ml-2 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full align-middle">Admin</span>)}
                      </div>
                      <div className="text-gray-400 text-sm">{user.email}</div>
                      <div className="text-gray-400 text-sm">Nitro: <span className="text-white/90 font-medium">{user.nitroLevel ?? 0}</span></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-300">Nitro</span>
                      <Input
                        type="number"
                        min={0}
                        className="w-20 bg-white/10 border-white/10 rounded-[12px] text-white"
                        defaultValue={user.nitroLevel}
                        id={`nitro-${user.id}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = parseInt((e.target as HTMLInputElement).value, 10)
                            if (Number.isFinite(val) && val >= 0) setNitro(user.id, val)
                          }
                        }}
                      />
                      <Button size="sm" onClick={() => setNitro(user.id, Math.max(0, (user.nitroLevel ?? 0) + 1))} className="bg-white/10 hover:bg-white/20 rounded-[10px]">
                        +1
                      </Button>
                      <Button size="sm" onClick={() => setNitro(user.id, Math.max(0, (user.nitroLevel ?? 0) + 10))} className="bg-white/10 hover:bg-white/20 rounded-[10px]">
                        +10
                      </Button>
                      <Button size="sm" onClick={() => {
                          const el = (e?: any) => document.getElementById(`nitro-${user.id}`) as HTMLInputElement | null
                          const val = parseInt(el()?.value || `${user.nitroLevel ?? 0}`, 10)
                          if (Number.isFinite(val) && val >= 0) setNitro(user.id, val)
                        }} disabled={saving === `nitro-${user.id}`} className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 rounded-[10px] shadow-[0_6px_20px_rgba(168,85,247,0.35)]">
                        {saving === `nitro-${user.id}` ? 'Saving...' : 'Set'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {selectedUsers.size > 0 && (
              <div className="mt-4 p-3 rounded-[15px] backdrop-blur-xl ring-1 ring-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] flex items-center gap-2">
                <div className="text-sm text-gray-300">Bulk Nitro for {selectedUsers.size} users:</div>
                <Input type="number" min={0} value={bulkUserNitro} onChange={(e) => setBulkUserNitro(e.target.value === '' ? '' : Number(e.target.value))} className="w-24 bg-white/10 border-white/10 rounded-[12px]" />
                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 rounded-[10px]" disabled={saving === 'bulk-nitro'} onClick={applyBulkNitro}>{saving === 'bulk-nitro' ? 'Applying...' : 'Apply'}</Button>
                <Button size="sm" variant="secondary" className="bg-white/10 rounded-[10px]" onClick={() => setSelectedUsers(new Set())}>Clear selection</Button>
              </div>
            )}
            <div className="flex items-center justify-between pt-4 text-sm text-gray-400">
              <div>Total: {usersView.total}</div>
              <div className="inline-flex items-center gap-2">
                <Button size="sm" variant="secondary" className="bg-white/10 rounded-[10px]" onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1}>Prev</Button>
                <span>Page {userPage} / {Math.max(1, Math.ceil(usersView.total / pageSize))}</span>
                <Button size="sm" variant="secondary" className="bg-white/10 rounded-[10px]" onClick={() => setUserPage(p => (p < Math.ceil(usersView.total / pageSize) ? p + 1 : p))} disabled={userPage >= Math.ceil(usersView.total / pageSize)}>Next</Button>
              </div>
            </div>
          </div>
        )}

        {tab === 'servers' && (
          <div className="rounded-[15px] p-6 backdrop-blur-xl ring-1 ring-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Servers</h2>
              <div className="flex items-center gap-2">
                <input
                  placeholder="Search by name or tag"
                  className="w-64 bg-white/10 border-white/10 rounded-[12px] text-white"
                  value={serverQuery}
                  onChange={(e) => { setServerQuery(e.target.value); setServerPage(1) }}
                />
                <select
                  className="bg-white/10 border-white/10 rounded-[12px] text-white"
                  value={serverSort}
                  onChange={(e) => setServerSort(e.target.value as any)}
                >
                  <option value="created_desc">Newest</option>
                  <option value="created_asc">Oldest</option>
                  <option value="members_desc">Members high → low</option>
                  <option value="boost_desc">Boost high → low</option>
                </select>
                <Button size="sm" onClick={createServerPrompt} className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 rounded-[10px] shadow-[0_6px_20px_rgba(168,85,247,0.35)]">
                  {saving === 'create-server' ? 'Creating...' : 'Create Server'}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2 text-sm text-gray-400">
              <button onClick={selectAllServersOnPage} className="hover:underline">{serversView.page.every(sv => selectedServers.has(sv.id)) && serversView.page.length > 0 ? 'Unselect all on page' : 'Select all on page'}</button>
              <div>{selectedServers.size} selected</div>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-auto pr-2">
              {serversView.page.length === 0 && (
                <div className="text-center text-gray-400 py-8">No servers found.</div>
              )}
              {serversView.page.map(srv => (
                <div key={srv.id} className="p-4 rounded-[15px] backdrop-blur-xl ring-1 ring-white/10 bg-white/5 shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1" checked={selectedServers.has(srv.id)} onChange={() => toggleServerSelect(srv.id)} />
                      <div>
                        <button onClick={() => setDetailServer(srv)} className="font-medium hover:underline">{srv.name}</button> {srv.tag ? <span className="text-gray-400">[{srv.tag}]</span> : null}
                      </div>
                      <div className="text-gray-400 text-sm">Members: {srv.members}</div>
                      <div className="text-gray-400 text-sm">Owner: {srv.owner.displayName} (@{srv.owner.username})</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-300">Boost</span>
                      <Input
                        type="number"
                        min={0}
                        className="w-20 bg-white/10 border-white/10 rounded-[12px] text-white"
                        defaultValue={srv.byteeLevel}
                        id={`boost-${srv.id}`}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value || '0', 10)
                          if (!Number.isFinite(val) || val < 0) return
                          setBoost(srv.id, val)
                        }}
                      />
                      <Button size="sm" variant="secondary" className="bg-white/10 rounded-[10px]" onClick={() => setBoost(srv.id, (srv.byteeLevel ?? 0) + 1)}>+1</Button>
                      <Button size="sm" variant="secondary" className="bg-white/10 rounded-[10px]" onClick={() => setBoost(srv.id, (srv.byteeLevel ?? 0) + 10)}>+10</Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          const container = (e.currentTarget.parentElement as HTMLElement)
                          const input = container.querySelector('input[type="number"]') as HTMLInputElement | null
                          const val = parseInt(input?.value || '0', 10)
                          if (!Number.isFinite(val) || val < 0) return
                          setBoost(srv.id, val)
                        }}
                        disabled={saving === `boost-${srv.id}`}
                        className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 rounded-[10px] shadow-[0_6px_20px_rgba(168,85,247,0.35)]"
                      >
                        {saving === `boost-${srv.id}` ? 'Saving...' : 'Set'}
                      </Button>
                      <Button size="sm" variant="secondary" className="bg-white/10 rounded-[10px]" onClick={() => advertiseServerPrompt(srv.id)} disabled={saving === `advertise-${srv.id}`}>
                        Advertise
                      </Button>
                      <Button size="sm" variant="destructive" className="bg-red-500/20 text-red-200 border border-red-500/30 rounded-[10px] hover:bg-red-500/30" onClick={() => deleteServer(srv.id)} disabled={saving === `delete-${srv.id}`}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
