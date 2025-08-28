"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { IAgoraRTCClient, ILocalAudioTrack, IRemoteAudioTrack, IAgoraRTCRemoteUser, UID } from 'agora-rtc-sdk-ng'
import { Mic, MicOff, Headphones, HeadphonesIcon, PhoneOff, Users, ScreenShare, ScreenShareOff } from 'lucide-react'

interface Props {
  serverId: string
  channelId: string
  me: { id: string; displayName: string; username: string; avatar?: string }
  onLeave?: () => void // optional callback so parent can close VC and switch channels
}

// Basic mesh voice with Socket.IO signaling
export default function VoiceChannel({ serverId, channelId, me, onLeave }: Props) {
  const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || ''
  const AGORA_TEMP_TOKEN = process.env.NEXT_PUBLIC_AGORA_TEMP_TOKEN || ''
  const CHANNEL_NAME = useMemo(() => channelId || 'darkbyte', [channelId])

  const [connected, setConnected] = useState(false)
  const [joining, setJoining] = useState(false)
  const [preview, setPreview] = useState(false) // in-channel but not published, audio muted
  const [muted, setMuted] = useState(false)
  const [deafened, setDeafened] = useState(false)
  const [peers, setPeers] = useState<Array<{ socketId: string; userId: string; displayName?: string; avatar?: string; banner?: string }>>([])
  const [screens, setScreens] = useState<Array<{ uid: string; track: any }>>([])
  const [volumes, setVolumes] = useState<Record<string, number>>({}) // uid -> volume level
  const [userVolumes, setUserVolumes] = useState<Record<string, number>>({}) // userId -> 0..100
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; userId: string | null }>({ open: false, x: 0, y: 0, userId: null })

  const clientRef = useRef<IAgoraRTCClient | null>(null)
  const localAudioRef = useRef<ILocalAudioTrack | null>(null)
  const screenTrackRef = useRef<any>(null)
  const remoteAudioMap = useRef<Map<UID, IRemoteAudioTrack>>(new Map())
  const joinedRef = useRef(false)
  const [clientUid, setClientUid] = useState<string>('')
  const AgoraRTCRef = useRef<any>(null)
  const previewRef = useRef<boolean>(false)

  // Persist per-channel audio prefs
  const storageKey = useMemo(() => `vc-audio-${serverId}-${channelId}`, [serverId, channelId])
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
      if (raw) {
        const data = JSON.parse(raw)
        if (data && typeof data === 'object') {
          if (data.userVolumes && typeof data.userVolumes === 'object') setUserVolumes(data.userVolumes)
          if (Array.isArray(data.mutedUsers)) setMutedUsers(new Set<string>(data.mutedUsers))
        }
      }
    } catch {}
  }, [storageKey])
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const data = { userVolumes, mutedUsers: Array.from(mutedUsers) }
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch {}
  }, [storageKey, userVolumes, mutedUsers])
  // (moved below applyUserAudioSettings definition)

  const applyUserAudioSettings = useCallback((targetUserId: string) => {
    const client = clientRef.current
    if (!client) return
    const vol = userVolumes[targetUserId] ?? 100
    const isMuted = mutedUsers.has(targetUserId) || deafened
    remoteAudioMap.current.forEach((track, uid) => {
      const uidUser = parseUserIdFromUid(uid)
      if (uidUser === targetUserId) {
        try {
          track.setVolume(isMuted ? 0 : vol)
        } catch {}
      }
    })
  }, [userVolumes, mutedUsers, deafened])

  // Apply loaded settings to any current tracks (now that applyUserAudioSettings exists)
  useEffect(() => {
    const ids = new Set<string>([...Object.keys(userVolumes), ...Array.from(mutedUsers)])
    ids.forEach(uid => applyUserAudioSettings(uid))
  }, [userVolumes, mutedUsers, applyUserAudioSettings])

  const setUserVolume = useCallback((userId: string, vol: number) => {
    setUserVolumes(prev => ({ ...prev, [userId]: vol }))
    setMutedUsers(prev => {
      const next = new Set(prev)
      if (vol === 0) next.add(userId); else next.delete(userId)
      return next
    })
    queueMicrotask(() => applyUserAudioSettings(userId))
  }, [applyUserAudioSettings])

  const toggleMuteUser = useCallback((userId: string) => {
    setMutedUsers(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId); else next.add(userId)
      return next
    })
    queueMicrotask(() => applyUserAudioSettings(userId))
  }, [applyUserAudioSettings])

  const getOrCreateTabUid = useCallback((baseId: string) => {
    // Always generate a fresh UID per mount to avoid lingering conflicts
    if (typeof window !== 'undefined') {
      try {
        const u = new URL(window.location.href)
        const qUid = u.searchParams.get('uid')
        if (qUid) return qUid
      } catch {}
    }
    const rand = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    return `${baseId}-${rand}`
  }, [])

  // keep preview ref in sync to avoid stale closure in event handlers
  useEffect(() => { previewRef.current = preview }, [preview])

  // Compute a merged volume per userId (max of all their Agora UIDs)
  const getUserVolume = useCallback((userId: string) => {
    const client = clientRef.current
    if (!client) return 0
    let max = 0
    for (const u of client.remoteUsers) {
      const uidUser = parseUserIdFromUid(u.uid)
      if (uidUser === userId) {
        const lvl = volumes[String(u.uid)] || 0
        if (lvl > max) max = lvl
      }
    }
    return max
  }, [volumes])

  // Update participants list from Agora client state
  const parseUserIdFromUid = (uid: UID): string => {
    const s = String(uid)
    const idx = s.indexOf('-')
    return idx > 0 ? s.slice(0, idx) : s
  }

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/profile`)
      if (!res.ok) return null
      const data = await res.json()
      return { displayName: data.displayName || undefined, avatar: data.avatar || undefined, banner: data.banner || undefined }
    } catch {
      return null
    }
  }, [])

  const refreshParticipants = useCallback(async () => {
    const client = clientRef.current
    if (!client) return
    const list = await Promise.all(client.remoteUsers.map(async (u) => {
      const userId = parseUserIdFromUid(u.uid)
      const prof = await fetchProfile(userId)
      return {
        socketId: String(u.uid),
        userId,
        displayName: prof?.displayName,
        avatar: prof?.avatar,
        banner: prof?.banner,
      }
    }))
    // Dedupe by userId (one card per user)
    const uniqByUser = Array.from(new Map(list.map(p => [p.userId, p])).values())
    // include self for count consistency
    const meEntry = { socketId: 'me', userId: me.id, displayName: me.displayName || me.username, avatar: me.avatar, banner: undefined }
    setPeers([meEntry as any, ...uniqByUser.filter(p => p.userId !== me.id)])
  }, [me.displayName, me.id, me.username, me.avatar, fetchProfile])

  const ensureLocalAudio = useCallback(async () => {
    if (localAudioRef.current) return localAudioRef.current
    if (!AgoraRTCRef.current) {
      const mod: any = await import('agora-rtc-sdk-ng')
      AgoraRTCRef.current = mod.default || mod
    }
    const track = await AgoraRTCRef.current.createMicrophoneAudioTrack({ AEC: true, ANS: true, AGC: true, encoderConfig: 'speech_low_quality' })
    localAudioRef.current = track
    return track
  }, [])

  // Agora join/leave helpers
  const joinAgora = useCallback(async (opts?: { previewOnly?: boolean }) => {
    if (joinedRef.current) return
    if (!AGORA_APP_ID) {
      console.error('[voice] Missing NEXT_PUBLIC_AGORA_APP_ID')
      return
    }
    try {
      setJoining(true)
      // Ensure any previous client is fully torn down to prevent ghost sessions
      if (clientRef.current) {
        try { clientRef.current.removeAllListeners() } catch {}
        try { await clientRef.current.leave() } catch {}
      }
      if (typeof window === 'undefined') return
      if (!AgoraRTCRef.current) {
        const mod: any = await import('agora-rtc-sdk-ng')
        AgoraRTCRef.current = mod.default || mod
      }
      const client = AgoraRTCRef.current.createClient({ mode: 'rtc', codec: 'vp8' })
      clientRef.current = client

      client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
        try {
          await client.subscribe(user, mediaType)
          if (mediaType === 'audio' && user.audioTrack) {
            // Do not play if this remote stream is actually our own user (prevents hearing yourself)
            const userId = parseUserIdFromUid(user.uid)
            if (userId === me.id) return
            remoteAudioMap.current.set(user.uid, user.audioTrack)
            if (!deafened && !previewRef.current) {
              const initialVol = mutedUsers.has(userId) ? 0 : (userVolumes[userId] ?? 100)
              user.audioTrack.setVolume(initialVol)
              user.audioTrack.play()
            }
            refreshParticipants()
          }
          if (mediaType === 'video' && (user as any).videoTrack) {
            const track: any = (user as any).videoTrack
            setScreens(prev => {
              const id = String(user.uid)
              if (prev.find(s => s.uid === id)) return prev
              return [...prev, { uid: id, track }]
            })
          }
        } catch (e) {
          console.error('[voice] subscribe error', e)
        }
      })

      client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
        if (mediaType === 'audio') {
          const t = remoteAudioMap.current.get(user.uid)
          t?.stop()
          remoteAudioMap.current.delete(user.uid)
          refreshParticipants()
        }
        if (mediaType === 'video') {
          const id = String(user.uid)
          setScreens(prev => prev.filter(s => s.uid !== id))
        }
      })

      client.on('user-left', (user: IAgoraRTCRemoteUser) => {
        refreshParticipants()
        // also remove any screenshare for this uid
        setScreens(prev => prev.filter(s => String(s.uid) !== String(user?.uid)))
      })
      // some SDKs provide user-joined; if available, refresh list so first user sees newcomers
      // @ts-ignore
      if (client.on) {
        // @ts-ignore
        client.on('user-joined', () => refreshParticipants())
      }

      // Enable volume indicator for speaking detection
      try {
        if (client.enableAudioVolumeIndicator) {
          // @ts-ignore - method exists in Agora RTC NG
          client.enableAudioVolumeIndicator()
          // @ts-ignore - set shorter interval for snappier UI if available
          if (client.setAudioVolumeIndicatorInterval) {
            // @ts-ignore
            client.setAudioVolumeIndicatorInterval(150)
          }
          // @ts-ignore - event exists
          client.on('volume-indicator', (result: Array<{ uid: UID; level: number }>) => {
            setVolumes(prev => {
              const next = { ...prev }
              result.forEach(r => { next[String(r.uid)] = r.level })
              return next
            })
          })
        }
      } catch (e) {
        console.debug('[voice] volume indicator unsupported', e)
      }

      // Determine a per-tab UID to avoid UID_CONFLICT when the same user opens multiple tabs
      let uidStr = clientUid || getOrCreateTabUid(me.id)
      setClientUid(uidStr)

      const fetchToken = async (uidToUse: string) => {
        let tok: string | null = null
        try {
          const url = `/api/agora/token?channel=${encodeURIComponent(CHANNEL_NAME)}&uid=${encodeURIComponent(uidToUse)}&role=publisher`
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            tok = data.token || null
            console.debug('[voice] token source: api, uid=', uidToUse)
          }
        } catch {}
        if (!tok) tok = AGORA_TEMP_TOKEN || null
        if (tok === AGORA_TEMP_TOKEN) console.debug('[voice] token source: temp token')
        return tok
      }

      let attempt = 0
      let lastErr: any = null
      while (attempt < 3) {
        try {
          const token = await fetchToken(uidStr)
          await client.join(AGORA_APP_ID, CHANNEL_NAME, token as any, uidStr as unknown as UID)
          break
        } catch (e: any) {
          lastErr = e
          const msg = String(e?.message || e?.name || '')
          const code = String((e && (e.code || e.name)) || '')
          const isConflict = msg.includes('UID_CONFLICT') || code.includes('UID_CONFLICT')
          if (!isConflict) throw e
          attempt += 1
          // generate a fresh UID and retry after a short backoff
          uidStr = `${me.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
          setClientUid(uidStr)
          await new Promise(r => setTimeout(r, 150 * attempt))
          // ensure client is clean before retry
          try { client.removeAllListeners('volume-indicator') } catch {}
          try { client.removeAllListeners('user-published') } catch {}
          try { client.removeAllListeners('user-unpublished') } catch {}
          try { client.removeAllListeners('user-left') } catch {}
          // rebind listeners after loop; we already bound before, so continue
        }
      }
      if (attempt >= 3 && lastErr) {
        throw lastErr
      }

      if (!(opts?.previewOnly)) {
        const mic = await ensureLocalAudio()
        await client.publish([mic])
        setConnected(true)
      } else {
        setPreview(true)
      }
      joinedRef.current = true
      refreshParticipants()
      console.debug('[voice] joined Agora channel', CHANNEL_NAME, 'uid=', uidStr)
    } catch (e: any) {
      setConnected(false)
      console.error('[voice] Agora join error', e?.message || e)
    } finally {
      setJoining(false)
    }
  }, [AGORA_APP_ID, AGORA_TEMP_TOKEN, CHANNEL_NAME, ensureLocalAudio, deafened, refreshParticipants, me.id, clientUid, getOrCreateTabUid])

  // disable socket signaling (migrated to Agora)

  // no-op peer creation in Agora path
  const createPeer = useCallback(async () => { return null as any }, [])

  const join = useCallback(async () => {
    await joinAgora()
  }, [joinAgora])

  const leave = useCallback(async () => {
    const client = clientRef.current
    try {
      if (joinedRef.current && client && localAudioRef.current) {
        try { await client.unpublish([localAudioRef.current]) } catch {}
        try { localAudioRef.current.stop() } catch {}
        try { localAudioRef.current.close() } catch {}
        localAudioRef.current = null
      }
      if (screenTrackRef.current && client) {
        try { await client.unpublish([screenTrackRef.current]) } catch {}
        try { screenTrackRef.current.stop() } catch {}
        try { screenTrackRef.current.close() } catch {}
        screenTrackRef.current = null
      }
      remoteAudioMap.current.forEach((t) => { try { t.stop() } catch {} })
      remoteAudioMap.current.clear()
      if (joinedRef.current && client) {
        try { await client.leave() } catch {}
      }
      try { client?.removeAllListeners() } catch {}
    } finally {
      setPeers([])
      joinedRef.current = false
      setConnected(false)
      setPreview(false)
      clientRef.current = null
      try { onLeave?.() } catch {}
    }
  }, [onLeave])

  // Call existing peers or accept calls to new ones
  // Agora handles peer connections internally; refresh participant list when peers change
  useEffect(() => {
    refreshParticipants()
  }, [connected, refreshParticipants])

  // Mute/deafen
  useEffect(() => {
    const track = localAudioRef.current
    if (!track) return
    track.setEnabled(!muted)
  }, [muted])

  useEffect(() => {
    // Apply global deafened along with per-user volumes
    const client = clientRef.current
    if (!client) return
    remoteAudioMap.current.forEach((t, uid) => {
      try {
        const uId = parseUserIdFromUid(uid)
        const baseVol = userVolumes[uId] ?? 100
        const isMuted = mutedUsers.has(uId) || deafened
        t.setVolume(isMuted ? 0 : baseVol)
      } catch {}
    })
  }, [deafened, userVolumes, mutedUsers])

  useEffect(() => {
    // Do not auto-join; show lobby first. Clean up on unmount.
    return () => { leave() }
  }, [leave])

  // Promote from preview to fully joined: publish mic and update state
  const confirmJoin = useCallback(async () => {
    const client = clientRef.current
    if (!client) {
      await joinAgora({ previewOnly: false })
      return
    }
    try {
      const mic = await ensureLocalAudio()
      await client.publish([mic])
      setConnected(true)
      setPreview(false)
      // start playing any already-subscribed remote audio now that we're fully joined
      remoteAudioMap.current.forEach((t, uid) => {
        try {
          const uId = parseUserIdFromUid(uid)
          const baseVol = userVolumes[uId] ?? 100
          const isMuted = mutedUsers.has(uId) || deafened
          if (!isMuted) {
            t.setVolume(baseVol)
            t.play()
          } else {
            t.setVolume(0)
          }
        } catch {}
      })
    } catch (e) {
      console.error('[voice] confirmJoin error', e)
    }
  }, [joinAgora, ensureLocalAudio])

  const toggleScreenshare = useCallback(async () => {
    const client = clientRef.current
    if (!client) return
    try {
      if (!screenTrackRef.current) {
        if (!AgoraRTCRef.current) {
          const mod: any = await import('agora-rtc-sdk-ng')
          AgoraRTCRef.current = mod.default || mod
        }
        const tracks = await AgoraRTCRef.current.createScreenVideoTrack({
          encoderConfig: '720p_1',
        }, 'auto')
        screenTrackRef.current = Array.isArray(tracks) ? tracks[0] : tracks
        await client.publish([screenTrackRef.current])
      } else {
        await client.unpublish([screenTrackRef.current])
        try { screenTrackRef.current.stop() } catch {}
        try { screenTrackRef.current.close() } catch {}
        screenTrackRef.current = null
      }
    } catch (e) {
      console.error('[voice] screenshare toggle error', e)
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-2 text-white">
          <Users className="h-4 w-4" />
          <span className="text-sm">Voice Channel</span>
          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${connected ? 'bg-green-500/20 text-green-300' : preview ? 'bg-yellow-500/20 text-yellow-300' : 'bg-gray-500/20 text-gray-300'}`}>{connected ? 'Connected' : preview ? 'Preview' : 'Disconnected'}</span>
        </div>

      {/* Context Menu for per-user audio */}
      {menu.open && menu.userId && (
        <div
          className="fixed z-50 min-w-[220px] bg-neutral-900/95 text-white border border-white/10 rounded-md shadow-xl p-3"
          style={{ left: menu.x + 4, top: menu.y + 4 }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="text-xs uppercase tracking-wide opacity-70 mb-2">Audio Controls</div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-sm">User volume</div>
            <button
              className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15"
              onClick={() => menu.userId && toggleMuteUser(menu.userId)}
            >{menu.userId && mutedUsers.has(menu.userId) ? 'Unmute' : 'Mute'}</button>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={userVolumes[menu.userId] ?? (mutedUsers.has(menu.userId) ? 0 : 100)}
            onChange={(e) => setUserVolume(menu.userId!, Number(e.target.value))}
            className="w-full"
          />
          <div className="mt-3 flex justify-end">
            <button className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20" onClick={() => setMenu(m => ({ ...m, open: false }))}>Close</button>
          </div>
        </div>
      )}
        <div className="flex items-center gap-2">
          <button onClick={() => setMuted(v => !v)} className={`px-3 py-1.5 rounded text-sm ${muted ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white'}`}>
            {muted ? <MicOff className="h-4 w-4 inline" /> : <Mic className="h-4 w-4 inline" />} {muted ? 'Unmute' : 'Mute'}
          </button>
          <button onClick={() => setDeafened(v => !v)} className={`px-3 py-1.5 rounded text-sm ${deafened ? 'bg-yellow-500/20 text-yellow-300' : 'bg-white/10 text-white'}`}>
            <Headphones className="h-4 w-4 inline" /> {deafened ? 'Undeafen' : 'Deafen'}
          </button>
          {connected || preview ? (
            <>
              <button onClick={toggleScreenshare} className="px-3 py-1.5 rounded text-sm bg-white/10 text-white">
                {screenTrackRef.current ? <ScreenShareOff className="h-4 w-4 inline" /> : <ScreenShare className="h-4 w-4 inline" />} Share
              </button>
              <button onClick={leave} className="px-3 py-1.5 rounded text-sm bg-red-500/20 text-red-300"><PhoneOff className="h-4 w-4 inline" /> Leave</button>
            </>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div
        className={`flex-1 grid grid-cols-1 ${screens.length > 0 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-4 p-4 overflow-auto`}
        onContextMenu={(e) => {
          const el = (e.target as HTMLElement)
          const target = el.closest('[data-voice-userid]') as HTMLElement | null
          if (target) {
            e.preventDefault()
            const userId = target.getAttribute('data-voice-userid') || ''
            setMenu({ open: true, x: e.clientX, y: e.clientY, userId })
          } else {
            setMenu(m => ({ ...m, open: false }))
          }
        }}
      >
        {/* Lobby card when not connected/preview */}
        {!connected && !preview && (
          <div className="lg:col-span-3 bg-black/40 rounded-lg border border-white/10 p-4">
            <div className="text-white mb-3">Join Voice</div>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setMuted(v => !v)} className={`px-3 py-1.5 rounded text-sm ${muted ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white'}`}>
                {muted ? <MicOff className="h-4 w-4 inline" /> : <Mic className="h-4 w-4 inline" />} {muted ? 'Unmute' : 'Mute'}
              </button>
              <button onClick={() => setDeafened(v => !v)} className={`px-3 py-1.5 rounded text-sm ${deafened ? 'bg-yellow-500/20 text-yellow-300' : 'bg-white/10 text-white'}`}>
                <HeadphonesIcon className="h-4 w-4 inline" /> {deafened ? 'Undeafen' : 'Deafen'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={joining} onClick={() => joinAgora({ previewOnly: true })} className="px-3 py-1.5 rounded text-sm bg-white/10 text-white disabled:opacity-50">{joining ? 'Preparing…' : 'Preview Channel'}</button>
              <button disabled={joining} onClick={() => joinAgora({ previewOnly: false })} className="px-3 py-1.5 rounded text-sm bg-green-500/20 text-green-300 disabled:opacity-50">{joining ? 'Joining…' : 'Join Voice'}</button>
            </div>
          </div>
        )}
        {/* Shared screens grid (if any) */}
        {(screens.length > 0) && (
          <div className="bg-black/40 rounded-lg border border-white/10 p-3" data-voice-userid={parseUserIdFromUid(screens[0].uid as any)}>
            <div className="text-white text-sm mb-2">Screensharing</div>
            <div className="relative aspect-video bg-black/70 rounded overflow-hidden">
              {mutedUsers.has(parseUserIdFromUid(screens[0].uid as any)) && (
                <div className="absolute top-2 right-2 bg-red-600/90 rounded-full p-1 shadow">
                  <MicOff className="h-4 w-4 text-white" />
                </div>
              )}
              <div ref={(el) => { if (el) { try { screens[0].track.play(el) } catch {} } }} className="w-full h-full" />
            </div>
          </div>
        )}

        {/* Local */}
        <div className="bg-black/40 rounded-lg border border-white/10 p-4" data-voice-userid={me.id}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-white/10">
                {me.avatar ? (
                  <img src={me.avatar} alt="Me" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                    {(me.displayName || me.username || 'U').charAt(0)}
                  </div>
                )}
              </div>
              {/* Speaking wave for self (only when actually speaking) */}
              {(() => {
                const localVol = volumes[clientUid] || 0
                const speaking = !muted && localVol > 3
                return (
                  <div className={`absolute -inset-1 rounded-full pointer-events-none transition ${speaking ? 'opacity-60 animate-pulse' : 'opacity-0'}`} style={{ background: 'radial-gradient(closest-side, rgba(168,85,247,0.25), transparent 70%)' }} />
                )
              })()}
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm">{me.displayName || me.username}</div>
              <div className="text-xs text-gray-400 truncate">{me.id}</div>
              <div className="mt-1 text-gray-400 text-xs">Mic: {muted ? 'Off' : 'On'} • Deafened: {deafened ? 'Yes' : 'No'}</div>
            </div>
          </div>
          {/* If in preview, show action to fully join */}
          {preview && !connected && (
            <div className="mt-3 flex items-center gap-2">
              <button onClick={confirmJoin} className="px-3 py-1.5 rounded text-sm bg-green-500/20 text-green-300">Join Voice</button>
              <button onClick={leave} className="px-3 py-1.5 rounded text-sm bg-red-500/20 text-red-300">Cancel</button>
            </div>
          )}
        </div>

        {/* Peers grid */}
        <div className={`${screens.length > 0 ? '' : 'lg:col-span-2'} bg-black/40 rounded-lg border border-white/10 p-4`}>
          <div className="text-white text-sm mb-3">Participants ({Math.max(0, peers.length - 1)})</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {joining && (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white/5 rounded border border-white/10 h-16" />
              ))
            )}
            {peers.filter(p => p.socketId !== 'me').map(p => {
              const vol = getUserVolume(p.userId)
              const speaking = vol > 3
              return (
                <div key={p.socketId} className="bg-white/5 rounded border border-white/10 overflow-hidden" data-voice-userid={p.userId}>
                  {/* Banner */}
                  <div className="h-10 w-full bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20">
                    {p.banner ? <img src={p.banner} alt="banner" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex items-center gap-3 p-3">
                    <div className="relative">
                      <div className={`h-10 w-10 rounded-full overflow-hidden ring-2 ${speaking ? 'ring-green-500/60' : 'ring-white/10'} transition`}>
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.displayName || p.userId} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                            {(p.displayName || p.userId || 'U').charAt(0)}
                          </div>
                        )}
                      </div>
                      {mutedUsers.has(p.userId) && (
                        <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 shadow">
                          <MicOff className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {/* Wave bars */}
                      <div className={`absolute -right-2 bottom-0 flex items-end gap-0.5 ${speaking ? 'opacity-100' : 'opacity-20'} transition-opacity`}>
                        {[0,1,2,3].map(i => (
                          <span key={i} className={`w-0.5 bg-green-400`} style={{ height: `${Math.min(12, Math.max(2, vol + (i*2)))}px` }} />
                        ))}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-white text-sm truncate">{p.displayName || p.userId}</div>
                      <div className="text-xs text-gray-400 truncate">{p.userId}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
