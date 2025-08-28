"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Search as SearchIcon, Users2, Star, Flame, Tag, Globe } from "lucide-react";

type ServerItem = {
  id: string;
  name: string;
  description?: string;
  banner?: string | { url?: string };
  bannerUrl?: string;
  icon?: string | { url?: string };
  iconUrl?: string;
  members?: number;
  tags?: string[];
};

const categories = [
  'Free hosting',
  'Paid hosting',
  'Free & paid hosting',
  'Indian hosting',
  'AI',
  'Setups',
  'More',
];

const resolveImageUrl = (val: any): string => {
  if (!val) return "";
  const v = typeof val === "string" ? val : val?.url || "";
  if (!v) return "";
  if (/^(https?:|data:|blob:|\/.+)/.test(v)) return v;
  return `/uploads/${v}`;
};

export default function DiscoverPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ discover: '1' });
        if (query.trim()) params.set('q', query.trim());
        if (selectedCat) params.set('category', selectedCat);
        const res = await fetch(`/api/servers?${params.toString()}`, { cache: 'no-store', signal: ctrl.signal });
        if (active && res.ok) {
          const data = await res.json();
          setServers(Array.isArray(data) ? data : []);
        }
        // fire-and-forget search tracking
        if (query.trim() || selectedCat) {
          fetch('/api/admin/analytics/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: query.trim() || undefined, category: selectedCat || undefined }),
          }).catch(() => {});
        }
      } catch {}
      finally {
        if (active) setLoading(false);
      }
    }, 300);
    return () => { active = false; ctrl.abort(); clearTimeout(t) };
  }, [query, selectedCat]);

  const filtered = useMemo(() => {
    // Server-side filtered already; keep client sort as a safety
    return [...servers].sort((a, b) => (b.members || 0) - (a.members || 0));
  }, [servers]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0b0d12] via-[#0f1115] to-[#0b0d12]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-purple-400" />
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-300 via-skyBlue to-cyan-300 bg-clip-text text-transparent">
              Discover
            </h1>
          </div>
          <button
            className="inline-flex items-center gap-2 px-3 h-10 rounded-xl bg-white/5 text-cyan-300 border border-cyan-400/40 hover:bg-white/10 transition"
            onClick={() => router.push(`/ai/convert/${params.id}`)}
            title="Open Darkbyte AI"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">AI</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search communities..."
            className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 pl-11 pr-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          />
          <SearchIcon className="h-5 w-5 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCat(null)}
            className={`px-3 py-1 rounded-full text-sm border ${selectedCat === null ? "bg-skyBlue/20 text-skyBlue border-skyBlue/40" : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"}`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCat(c)}
              className={`px-3 py-1 rounded-full text-sm border ${selectedCat === c ? "bg-skyBlue/20 text-skyBlue border-skyBlue/40" : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"}`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Trending label */}
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-5 w-5 text-yellow-400" />
          <span className="text-white/80">Trending communities</span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && [1,2,3,4,5,6].map((i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 h-52 animate-pulse" />
          ))}

          {!loading && filtered.map((server) => {
            const banner = resolveImageUrl(server.bannerUrl || server.banner);
            const icon = resolveImageUrl(server.iconUrl || server.icon);
            return (
              <div
                key={server.id}
                className="group bg-white/[0.04] backdrop-blur-2xl rounded-2xl border border-white/10 hover:border-skyBlue/40 transition-all duration-300 cursor-pointer hover:scale-[1.02] shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden"
                onClick={() => router.push(`/server/${server.id}`)}
              >
                {banner ? (
                  <div className="relative h-24">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={banner} alt={`${server.name} banner`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  </div>
                ) : (
                  <div className="h-24 bg-gradient-to-br from-sky-400/10 to-cyan-400/10" />
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/20 bg-white/5 flex items-center justify-center">
                      {icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={icon} alt={server.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-skyBlue font-bold">{server.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <Users2 className="h-4 w-4" />
                      <span>{server.members ?? 0} members</span>
                    </div>
                  </div>
                  <div className="text-white font-semibold mb-1 line-clamp-1">{server.name}</div>
                  <div className="text-white/70 text-sm mb-3 line-clamp-2">{server.description}</div>
                  <div className="flex flex-wrap gap-2">
                    {(server.tags || []).slice(0,3).map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
