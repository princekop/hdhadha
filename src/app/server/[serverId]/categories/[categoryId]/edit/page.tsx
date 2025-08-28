"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft } from 'lucide-react'

function FallbackCheckbox({ checked, onCheckedChange }: { checked: boolean, onCheckedChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`w-5 h-5 rounded border ${checked ? 'bg-purple-600 border-purple-500' : 'bg-transparent border-white/30'} flex items-center justify-center`}
    >
      {checked && <div className="w-2.5 h-2.5 bg-white rounded" />}
    </button>
  )
}
const Bool = (props: any) => <FallbackCheckbox {...props} />

export default function EditCategoryPage() {
  const router = useRouter()
  const params = useParams<{ serverId: string; categoryId: string }>()
  const serverId = params.serverId
  const categoryId = params.categoryId

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')

  // Category fields
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')

  // Roles and permissions template to apply to all channels in category
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([])
  const [perms, setPerms] = useState<Record<string, { canRead?: boolean | null; canSend?: boolean | null; canSendGifs?: boolean | null; canReact?: boolean | null }>>({})

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        setLoading(true)
        setError('')
        // Category
        const catRes = await fetch(`/api/categories/${categoryId}`)
        if (!catRes.ok) throw new Error('Failed to load category')
        const cat = await catRes.json()
        if (!alive) return
        setName(cat.name || '')
        setEmoji(cat.emoji || '')

        // Roles
        const rolesRes = await fetch(`/api/servers/${serverId}/roles`)
        if (!rolesRes.ok) throw new Error('Failed to load roles')
        const rs = await rolesRes.json()
        if (!alive) return
        setRoles(rs.map((r: any) => ({ id: r.id, name: r.name })))

        // Permissions template (derived from first channel in category)
        const pRes = await fetch(`/api/categories/${categoryId}/permissions`)
        if (!pRes.ok) throw new Error('Failed to load permissions')
        const data = await pRes.json()
        const pList: any[] = data.entries || []
        if (!alive) return
        const map: typeof perms = {}
        const everyone = pList.find((p: any) => p.roleId === null && p.userId === null)
        map['everyone'] = {
          canRead: everyone?.canRead ?? true,
          canSend: everyone?.canSend ?? true,
          canSendGifs: everyone?.canSendGifs ?? true,
          canReact: everyone?.canReact ?? true,
        }
        for (const r of rs) {
          const pr = pList.find((p: any) => p.roleId === r.id && p.userId === null)
          map[r.id] = {
            canRead: pr?.canRead ?? null,
            canSend: pr?.canSend ?? null,
            canSendGifs: pr?.canSendGifs ?? null,
            canReact: pr?.canReact ?? null,
          }
        }
        setPerms(map)
      } catch (e: any) {
        if (alive) setError(e.message || 'Failed to load')
      } finally {
        if (alive) setLoading(false)
      }
    }
    if (serverId && categoryId) load()
    return () => { alive = false }
  }, [serverId, categoryId])

  const entriesPayload = useMemo(() => {
    const entries: any[] = []
    if (perms['everyone']) entries.push({ roleId: null, userId: null, ...perms['everyone'] })
    for (const r of roles) {
      const p = perms[r.id]
      if (!p) continue
      entries.push({ roleId: r.id, userId: null, ...p })
    }
    return entries
  }, [perms, roles])

  async function saveCategory() {
    try {
      setSaving(true)
      setError('')
      // Save category fields
      const u1 = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji }),
      })
      if (!u1.ok) throw new Error('Failed to save category')

      // Apply permissions to all channels in the category
      const u2 = await fetch(`/api/categories/${categoryId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: entriesPayload }),
      })
      if (!u2.ok) throw new Error('Failed to save permissions')

      router.back()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function setPerm(key: string, field: keyof (typeof perms)[string], value: boolean) {
    setPerms(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0f1a] to-[#0f1729] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center space-x-3 mb-6">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold">Edit Category</h1>
        </div>

        {error && (
          <div className="mb-4 text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded">{error}</div>
        )}

        {loading ? (
          <div className="text-gray-300">Loading...</div>
        ) : (
          <div className="space-y-8">
            <section className="bg-black/40 border border-white/10 rounded-lg p-4">
              <h2 className="font-medium mb-4">General</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300">Name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} className="mt-1 bg-black/40 border-white/20 text-white" />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Emoji (optional)</label>
                  <Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder=":sparkles:" className="mt-1 bg-black/40 border-white/20 text-white" />
                </div>
              </div>
            </section>

            <section className="bg-black/40 border border-white/10 rounded-lg p-4">
              <h2 className="font-medium mb-4">Default Permissions for Channels in this Category</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm text-gray-300 mb-2">@everyone</h3>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <Bool checked={!!perms['everyone']?.canRead} onCheckedChange={(v: boolean) => setPerm('everyone', 'canRead', v)} />
                      <span>View/Read</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Bool checked={!!perms['everyone']?.canSend} onCheckedChange={(v: boolean) => setPerm('everyone', 'canSend', v)} />
                      <span>Send Messages</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Bool checked={!!perms['everyone']?.canSendGifs} onCheckedChange={(v: boolean) => setPerm('everyone', 'canSendGifs', v)} />
                      <span>Send GIFs/Images</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Bool checked={!!perms['everyone']?.canReact} onCheckedChange={(v: boolean) => setPerm('everyone', 'canReact', v)} />
                      <span>React</span>
                    </label>
                  </div>
                </div>

                {roles.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm text-gray-300">Roles</h3>
                    {roles.map(r => (
                      <div key={r.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded px-3 py-2">
                        <div className="text-sm">{r.name}</div>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 text-xs">
                            <Bool checked={!!perms[r.id]?.canRead} onCheckedChange={(v: boolean) => setPerm(r.id, 'canRead', v)} />
                            <span>Read</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs">
                            <Bool checked={!!perms[r.id]?.canSend} onCheckedChange={(v: boolean) => setPerm(r.id, 'canSend', v)} />
                            <span>Send</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs">
                            <Bool checked={!!perms[r.id]?.canSendGifs} onCheckedChange={(v: boolean) => setPerm(r.id, 'canSendGifs', v)} />
                            <span>GIFs</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs">
                            <Bool checked={!!perms[r.id]?.canReact} onCheckedChange={(v: boolean) => setPerm(r.id, 'canReact', v)} />
                            <span>React</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => router.back()} disabled={saving}>Cancel</Button>
              <Button onClick={saveCategory} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
