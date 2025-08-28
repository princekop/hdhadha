"use client";

import React, { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import ProfileVideoEffect from "@/components/ProfileVideoEffect";

export type Presence = "online" | "idle" | "dnd" | "offline";

export interface LandscapeProfileWidgetProps {
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  decorationSlug?: string | null;
  displayName: string;
  username: string;
  status: Presence;
  description?: string | null;
  createdAt?: string | Date;
  className?: string;
  onStatusChange?: (status: Presence) => void;
  roleName?: string | null;
}

const LandscapeProfileWidget: React.FC<LandscapeProfileWidgetProps> = ({
  avatarUrl,
  bannerUrl,
  decorationSlug,
  displayName,
  username,
  status,
  description,
  createdAt,
  className,
  onStatusChange,
  roleName,
}) => {
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoOpacity, setVideoOpacity] = useState(60);

  // Load shared video effect settings (set in edit page)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("db_profile_video_effect");
      if (raw) {
        const obj = JSON.parse(raw);
        if (typeof obj.enabled === "boolean") setVideoEnabled(obj.enabled);
        if (typeof obj.opacity === "number") setVideoOpacity(obj.opacity);
      }
    } catch {}
  }, []);

  const createdAtText = useMemo(() => {
    if (!createdAt) return null;
    const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString();
  }, [createdAt]);

  return (
    <div className={("w-full rounded-2xl border border-white/10 overflow-hidden bg-[#0f0f12] " + (className || "")).trim()}>
      {/* Banner with optional video overlay (landscape emphasis) */}
      <div className="relative h-40 sm:h-44 md:h-48 select-none" onContextMenu={(e) => e.preventDefault()}>
        {bannerUrl ? (
          <img src={bannerUrl} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[#1f2547]" />
        )}
        {videoEnabled && (
          <ProfileVideoEffect
            src={"/profile%20effect/profile-1.mp4"}
            opacity={videoOpacity}
            className="absolute inset-0 w-full h-full"
            playing
          />
        )}
        {/* Soft dark gradient for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Right-side role/badge pill */}
        <div className="absolute right-4 top-4">
          <div className="px-4 py-2 rounded-full bg-[#E0007A] text-white text-sm font-semibold shadow-[0_4px_0_0_rgba(0,0,0,0.4)]">
            {roleName || 'Member'}
          </div>
        </div>

        {/* Avatar overlay */}
        <div className="absolute left-5 -bottom-10">
          <div className="rounded-full ring-4 ring-[#0f0f12] w-[96px] h-[96px] overflow-hidden bg-gray-600 flex items-center justify-center">
            <Avatar src={avatarUrl || undefined} alt="Avatar" size={96} decorationSlug={decorationSlug ?? undefined} />
          </div>
        </div>

        {/* Compact status selector top-right */}
        <div className="absolute right-4 bottom-3 flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg px-2 py-1">
          <span className="text-[11px] text-white/80">Status</span>
          <select
            value={status}
            onChange={(e) => onStatusChange?.(e.target.value as Presence)}
            className="bg-transparent text-white text-xs outline-none"
          >
            <option className="bg-[#1f2125]" value="online">online</option>
            <option className="bg-[#1f2125]" value="idle">idle</option>
            <option className="bg-[#1f2125]" value="dnd">dnd</option>
            <option className="bg-[#1f2125]" value="offline">offline</option>
          </select>
        </div>
      </div>

      {/* Body */}
      <div className="pt-12 px-5 pb-5">
        {/* Name chip */}
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6B1A1A] text-white/90 shadow-[0_4px_0_0_rgba(0,0,0,0.4)]">
            <span className="font-semibold text-sm">{displayName}</span>
            <span className="text-xs text-white/70">@{username}</span>
          </div>
        </div>

        {/* About Me block with label */}
        <div className="relative mt-2">
          <div className="absolute -top-3 left-3 px-2 py-0.5 rounded-full bg-[#222] border border-[#3A3B3E] text-[11px] font-bold text-sky-300 shadow-[0_0_12px_rgba(125,249,255,0.35)]">
            About Me
          </div>
          <div className="p-4 bg-[#3a3832] rounded-2xl text-gray-200 text-sm border border-[#3A3B3E] shadow-[0_0_0_3px_rgba(255,255,255,0.05)_inset,0_0_24px_rgba(0,0,0,0.35)]">
            <div className="whitespace-pre-line leading-relaxed">
              {description || 'No bio yet.'}
            </div>
          </div>
        </div>

        {/* Member Since with progress */}
        <div className="mt-4 text-xs text-gray-400">
          <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2b2b2d] border border-[#1E1F22] text-white/80 shadow-[0_4px_0_0_rgba(0,0,0,0.4)]">
            <span className="uppercase tracking-wide font-semibold">Member Since</span>
            <span className="text-white/60">{createdAtText || '—'}</span>
          </div>
          {(() => {
            const created = createdAt ? (typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime()) : null
            const now = Date.now()
            let pct = 10
            if (created && !isNaN(created)) {
              const days = Math.max(0, (now - created) / (1000*60*60*24))
              pct = Math.min(100, Math.round((days / 365) * 100))
            }
            return (
              <div className="w-full bg-[#2b2b2d] border-2 border-[#3A3B3E] rounded-full h-5 flex items-center px-1 shadow-[inset_0_0_12px_rgba(0,0,0,0.4)]">
                <div className="h-3 rounded-full bg-white/20 flex-1 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-400 to-cyan-400" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  );
};

export default LandscapeProfileWidget;
