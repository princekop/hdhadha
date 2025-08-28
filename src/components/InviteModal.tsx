'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  X, 
  Copy, 
  Clock, 
  Users, 
  Link, 
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface Invite {
  id: string
  code: string
  serverId: string
  expiresAt: string | null
  maxUses: number | null
  uses: number
  createdAt: string
  creator: {
    id: string
    username: string
    displayName: string
  }
}

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  serverId: string
  serverName: string
}

export default function InviteModal({ isOpen, onClose, serverId, serverName }: InviteModalProps) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [expiresIn, setExpiresIn] = useState('')
  const [maxUses, setMaxUses] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchInvites()
    }
  }, [isOpen, serverId])

  const fetchInvites = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/invites?serverId=${serverId}`)
      if (response.ok) {
        const data = await response.json()
        setInvites(data)
      }
    } catch (error) {
      console.error('Error fetching invites:', error)
    } finally {
      setLoading(false)
    }
  }

  const createInvite = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverId,
          expiresIn: expiresIn ? parseInt(expiresIn) * 3600 : null, // Convert hours to seconds
          maxUses: maxUses ? parseInt(maxUses) : null
        })
      })

      if (response.ok) {
        const newInvite = await response.json()
        setInvites(prev => [newInvite, ...prev])
        setExpiresIn('')
        setMaxUses('')
      }
    } catch (error) {
      console.error('Error creating invite:', error)
    } finally {
      setCreating(false)
    }
  }

  const copyInviteLink = (code: string) => {
    const inviteLink = `${window.location.origin}/invite/${code}`
    navigator.clipboard.writeText(inviteLink)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const deleteInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/invites/${inviteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setInvites(prev => prev.filter(invite => invite.id !== inviteId))
      }
    } catch (error) {
      console.error('Error deleting invite:', error)
    }
  }

  const formatExpiration = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never expires'
    const date = new Date(expiresAt)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }

  const formatCreatedAt = (createdAt: string) => {
    const date = new Date(createdAt)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 p-2 sm:p-4 flex">
      <div className="relative bg-gray-900 border border-white/10 w-full sm:max-w-2xl sm:mx-auto rounded-none sm:rounded-2xl overflow-hidden h-[96vh] sm:h-auto self-stretch sm:self-center">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 bg-gray-900/95 backdrop-blur-xl">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white">Invite People to {serverName}</h2>
            <p className="text-gray-400 text-xs sm:text-sm">Share this server with friends</p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(96vh-64px)] sm:max-h-[calc(90vh-140px)]">
          {/* Create New Invite */}
          <div className="p-4 sm:p-6 border-b border-white/10">
            <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">Create New Invite</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Expires in (hours)
                </label>
                <Input
                  type="number"
                  placeholder="24 (empty = never)"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="bg-gray-800 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Max uses
                </label>
                <Input
                  type="number"
                  placeholder="10 (empty = unlimited)"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="bg-gray-800 border-white/10 text-white"
                />
              </div>
            </div>
            <Button
              onClick={createInvite}
              disabled={creating}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              {creating ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                <div className="flex items-center">
                  <Link className="h-4 w-4 mr-2" />
                  Create Invite
                </div>
              )}
            </Button>
          </div>

          {/* Existing Invites */}
          <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">Active Invites</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading invites...</p>
              </div>
            ) : invites.length === 0 ? (
              <div className="text-center py-8">
                <Link className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400">No active invites</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="bg-gray-800/50 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Link className="h-4 w-4 text-purple-400" />
                        <span className="text-white font-mono text-sm">
                          {invite.code}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => copyInviteLink(invite.code)}
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                        >
                          {copied === invite.code ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => deleteInvite(invite.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-300">{formatExpiration(invite.expiresAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-300">
                          {invite.maxUses ? `${invite.uses}/${invite.maxUses}` : `${invite.uses} uses`}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-400">Created:</span>
                        <span className="text-gray-300">{formatCreatedAt(invite.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-400">By:</span>
                        <span className="text-gray-300">{invite.creator.displayName}</span>
                      </div>
                    </div>

                    {/* Full invite link */}
                    <div className="mt-3 p-2 bg-gray-900 rounded border border-white/5">
                      <p className="text-[11px] sm:text-xs text-gray-400 break-all">
                        {`${window.location.origin}/invite/${invite.code}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}