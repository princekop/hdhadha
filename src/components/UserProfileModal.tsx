import React, { useMemo, useState, useEffect } from 'react'
import { X, Globe, Music } from 'lucide-react'
import LandscapeProfileWidget from '@/components/LandscapeProfileWidget'

export type UserProfileModalProps = {
  isOpen: boolean
  onClose: () => void
  displayName?: string
  username: string
  bannerUrl?: string | null
  avatarUrl?: string | null
  avatarDecoration?: string | null
  status?: string
  presenceClass?: string // tailwind color class for presence dot
  roleName?: string | null
  roleColor?: string | null
  createdAt?: string | Date | null
  description?: string | null
  badges?: Array<{ icon?: React.ReactNode; label: string; colorClass?: string }>
  connections?: Array<{ icon?: React.ReactNode; label: string; href?: string }>
  topLinkLabel?: string | null // e.g. 'discord.gg/BladeMC'
  topLinkHref?: string | null
  roles?: Array<{ id: string; name: string; color?: string | null; gradient?: string | null; animated?: boolean }>
}

export default function UserProfileModal(props: UserProfileModalProps) {
  const {
    isOpen,
    onClose,
    displayName,
    username,
    avatarUrl,
    avatarDecoration, // reserved for future decoration support
    status,
    roleName,
    createdAt,
    description,
    badges,
    connections,
    topLinkLabel,
    topLinkHref,
    roles = [],
  } = props

  if (!isOpen) return null

  const [statusValue, setStatusValue] = useState<'online' | 'idle' | 'dnd' | 'offline'>(
    (status as any) || 'online'
  )

  useEffect(() => {
    if (status) setStatusValue(status as any)
  }, [status])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="bg-black/90 backdrop-blur-xl rounded-2xl w-full sm:max-w-lg md:max-w-2xl lg:max-w-3xl border border-white/20 animate-fade-in shadow-2xl overflow-hidden max-h-[90vh] grid grid-rows-[auto,1fr]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-2xl font-bold text-white">User Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-6 pb-6 min-h-0">
          {/* Landscape profile widget (shared with /dash) */}
          <LandscapeProfileWidget
            avatarUrl={avatarUrl || undefined}
            bannerUrl={props.bannerUrl || undefined}
            decorationSlug={avatarDecoration || undefined}
            displayName={displayName || username}
            username={username}
            status={statusValue as any}
            description={description || undefined}
            createdAt={createdAt || undefined}
            roleName={roleName || undefined}
            onStatusChange={(s) => setStatusValue(s as any)}
          />

          {/* Roles list within this server */}
          {roles.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-white/60 mb-2">Roles</div>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => {
                  const style = r.gradient
                    ? `bg-gradient-to-r ${r.gradient} ${r.animated ? 'animate-gradient-slow bg-[length:200%_200%]' : ''}`
                    : ''
                  return (
                    <span
                      key={r.id}
                      className={`px-2 py-1 rounded-full text-xs border border-white/10 text-white/90 ${style || ''}`}
                      style={!r.gradient && r.color ? { backgroundColor: r.color, color: '#0b0b0b' } : undefined}
                      title={r.name}
                    >
                      {r.name}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Optional top link pill below the widget */}
          {(topLinkLabel || topLinkHref) && (
            <a
              href={(topLinkHref || '#') as string}
              target={topLinkHref ? '_blank' : undefined}
              rel={topLinkHref ? 'noreferrer' : undefined}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 text-gray-100 text-sm hover:bg-black/60 transition-colors"
            >
              <span className="inline-grid place-items-center w-5 h-5 rounded-full bg-black/50 border border-white/10 text-[11px] text-white/90">
                {(topLinkLabel || topLinkHref || 'L')!.trim().charAt(0).toUpperCase()}
              </span>
              <span className="truncate max-w-[60vw] sm:max-w-[40ch]">
                {topLinkLabel || topLinkHref}
              </span>
            </a>
          )}

          {/* Connections removed as requested */}
        </div>
      </div>
    </div>
  )
}
