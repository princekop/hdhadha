'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type MetaServer = {
  id: string
  name: string
  description?: string
  banner?: string
  icon?: string
}

export default function ClientInvite({ code, meta }: { code: string; meta?: MetaServer }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const acceptInvite = async () => {
    setJoining(true)
    setError(null)
    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to accept invite' }))
        throw new Error(err.error || 'Failed to accept invite')
      }
      const data = await res.json()
      router.push(`/server/${data.serverId}`)
    } catch (e: any) {
      setError(e?.message || 'Failed to accept invite')
    } finally {
      setJoining(false)
    }
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) return
    // Auto-join on load if signed in
    acceptInvite()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0d12] via-[#141821] to-[#0b0d12] flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-skyBlue/30 shadow-[0_0_60px_rgba(56,189,248,0.25)] bg-[#0f1115]/80 backdrop-blur-xl">
        {/* Banner */}
        <div className="relative h-40 sm:h-56">
          {meta?.banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={meta.banner}
              alt="Banner"
              className="absolute inset-0 w-full h-full object-cover select-none"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-skyBlue/20 via-purple-500/10 to-cyan-300/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          {/* Icon */}
          <div className="absolute -bottom-10 left-6 w-20 h-20 rounded-2xl border-2 border-skyBlue bg-[#111] overflow-hidden shadow-xl">
            {meta?.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meta.icon}
                alt="Icon"
                className="w-full h-full object-cover select-none"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-black text-2xl">
                {(meta?.name || 'SV').slice(0,2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="pt-14 px-6 pb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-purple-300 via-skyBlue to-cyan-300 bg-clip-text text-transparent">
            {meta?.name || 'Join this server'}
          </h1>
          <p className="mt-2 text-gray-300 line-clamp-3">{meta?.description || 'Join this community on Darkbyte and connect with members instantly.'}</p>

          <div className="mt-6 space-y-3">
            {error && <div className="text-red-400">{error}</div>}
            {session ? (
              <button
                disabled={joining}
                onClick={acceptInvite}
                className="px-5 py-3 rounded-xl bg-skyBlue text-white font-semibold hover:bg-sky-400/90 disabled:opacity-60 w-full"
              >
                {joining ? 'Joining...' : 'Accept Invite'}
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(`/invite/${code}`)}`)}
                  className="px-5 py-3 rounded-xl bg-skyBlue text-white font-semibold hover:bg-sky-400/90"
                >
                  Sign in to Join
                </button>
                <button
                  onClick={() => router.push(`/register?callbackUrl=${encodeURIComponent(`/invite/${code}`)}`)}
                  className="px-5 py-3 rounded-xl border border-white/15 text-white hover:bg-white/5"
                >
                  Create Account
                </button>
              </div>
            )}
            <p className="text-xs text-gray-400 break-all">Invite code: {code}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
