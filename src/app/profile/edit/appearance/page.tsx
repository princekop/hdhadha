'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Sparkles } from 'lucide-react'

export default function AppearancePage() {
  const router = useRouter()

  const [theme, setTheme] = useState<string>('default')
  const [chatBgUrl, setChatBgUrl] = useState<string>('')
  const [chatBgOpacity, setChatBgOpacity] = useState<number>(30)
  const [blur, setBlur] = useState<number>(0)
  const [useCustomGradient, setUseCustomGradient] = useState<boolean>(false)
  const [fromColor, setFromColor] = useState<string>('#5b21b6')
  const [viaColor, setViaColor] = useState<string>('#00000000')
  const [toColor, setToColor] = useState<string>('#1e3a8a')
  const [fontScale, setFontScale] = useState<number>(100)
  const [vignette, setVignette] = useState<number>(0)

  // Load existing settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem('db_appearance')
      if (saved) {
        const obj = JSON.parse(saved)
        if (obj.theme) setTheme(obj.theme)
        if (typeof obj.chatBgUrl === 'string') setChatBgUrl(obj.chatBgUrl)
        if (typeof obj.chatBgOpacity === 'number') setChatBgOpacity(obj.chatBgOpacity)
        if (typeof obj.blur === 'number') setBlur(obj.blur)
        if (typeof obj.useCustomGradient === 'boolean') setUseCustomGradient(obj.useCustomGradient)
        if (typeof obj.fromColor === 'string') setFromColor(obj.fromColor)
        if (typeof obj.viaColor === 'string') setViaColor(obj.viaColor)
        if (typeof obj.toColor === 'string') setToColor(obj.toColor)
        if (typeof obj.fontScale === 'number') setFontScale(obj.fontScale)
        if (typeof obj.vignette === 'number') setVignette(obj.vignette)
      }
    } catch {}
  }, [])

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem('db_appearance', JSON.stringify({ theme, chatBgUrl, chatBgOpacity, blur, useCustomGradient, fromColor, viaColor, toColor, fontScale, vignette }))
    } catch {}
  }, [theme, chatBgUrl, chatBgOpacity, blur, useCustomGradient, fromColor, viaColor, toColor, fontScale, vignette])

  const themeOverlayClass = useMemo(() => {
    switch (theme) {
      case 'cyber':
        return 'from-fuchsia-900/25 via-transparent to-cyan-900/25'
      case 'sunset':
        return 'from-orange-900/25 via-transparent to-pink-900/25'
      case 'emerald':
        return 'from-emerald-900/25 via-transparent to-teal-900/25'
      case 'neon':
        return 'from-lime-900/25 via-transparent to-yellow-900/25'
      case 'ocean':
        return 'from-cyan-900/25 via-transparent to-blue-900/25'
      case 'forest':
        return 'from-green-900/25 via-transparent to-emerald-900/25'
      case 'midnight':
        return 'from-indigo-900/25 via-transparent to-slate-900/25'
      case 'lava':
        return 'from-red-900/25 via-transparent to-orange-900/25'
      case 'aurora':
        return 'from-emerald-900/25 via-transparent to-fuchsia-900/25'
      case 'pastel':
        return 'from-pink-900/15 via-transparent to-sky-900/15'
      case 'royal':
        return 'from-violet-900/25 via-transparent to-indigo-900/25'
      case 'default':
      default:
        return 'from-purple-900/20 via-transparent to-blue-900/20'
    }
  }, [theme])

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0b0d12]">
      {/* Background gradient overlay */}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${themeOverlayClass}`} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" onClick={() => router.push('/profile/edit')} className="text-skyBlue hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-2 text-skyBlue font-semibold">
            <Sparkles className="h-5 w-5" />
            Appearance
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 p-5">
            <h2 className="text-white font-semibold mb-4">Customize</h2>

            {/* Theme buttons */}
            <div className="mb-6">
              <div className="text-skyBlue text-xs font-medium mb-2">Theme</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'default', label: 'Default', ring: 'ring-purple-400/40' },
                  { id: 'cyber', label: 'Cyber', ring: 'ring-fuchsia-400/40' },
                  { id: 'sunset', label: 'Sunset', ring: 'ring-orange-400/40' },
                  { id: 'emerald', label: 'Emerald', ring: 'ring-emerald-400/40' },
                  { id: 'neon', label: 'Neon', ring: 'ring-lime-400/40' },
                  { id: 'ocean', label: 'Ocean', ring: 'ring-cyan-400/40' },
                  { id: 'forest', label: 'Forest', ring: 'ring-green-400/40' },
                  { id: 'midnight', label: 'Midnight', ring: 'ring-indigo-400/40' },
                  { id: 'lava', label: 'Lava', ring: 'ring-red-400/40' },
                  { id: 'aurora', label: 'Aurora', ring: 'ring-emerald-300/40' },
                  { id: 'pastel', label: 'Pastel', ring: 'ring-pink-300/40' },
                  { id: 'royal', label: 'Royal', ring: 'ring-violet-300/40' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`px-3 py-2 rounded-lg text-sm border transition-all duration-200 
                      ${theme === t.id ? 'border-skyBlue/50 text-white bg-white/10 ring-2 ' + t.ring : 'border-white/10 text-skyBlue hover:bg-white/5'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background URL */}
            <div className="mb-6">
              <div className="text-skyBlue text-xs font-medium mb-2">Chat Background URL</div>
              <Input
                value={chatBgUrl}
                onChange={(e) => setChatBgUrl(e.target.value)}
                placeholder="https://images/..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            {/* Opacity */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-skyBlue text-xs">Background Opacity</label>
                <span className="text-skyBlue text-xs font-semibold">{chatBgOpacity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={chatBgOpacity}
                onChange={(e) => setChatBgOpacity(Number(e.target.value))}
                className="w-full accent-skyBlue"
              />
            </div>

            {/* Blur */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-skyBlue text-xs">Background Blur</label>
                <span className="text-skyBlue text-xs font-semibold">{blur}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                value={blur}
                onChange={(e) => setBlur(Number(e.target.value))}
                className="w-full accent-skyBlue"
              />
            </div>

            {/* Custom Gradient */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-skyBlue text-xs">Use Custom Gradient</label>
                <input type="checkbox" checked={useCustomGradient} onChange={(e) => setUseCustomGradient(e.target.checked)} />
              </div>
              {useCustomGradient && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-skyBlue text-[11px] mb-1">From</div>
                    <input type="color" value={fromColor} onChange={(e) => setFromColor(e.target.value)} className="w-full h-8 bg-transparent" />
                  </div>
                  <div>
                    <div className="text-skyBlue text-[11px] mb-1">Via</div>
                    <input type="color" value={viaColor} onChange={(e) => setViaColor(e.target.value)} className="w-full h-8 bg-transparent" />
                  </div>
                  <div>
                    <div className="text-skyBlue text-[11px] mb-1">To</div>
                    <input type="color" value={toColor} onChange={(e) => setToColor(e.target.value)} className="w-full h-8 bg-transparent" />
                  </div>
                </div>
              )}
            </div>

            {/* Font scale */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-skyBlue text-xs">Font Size</label>
                <span className="text-skyBlue text-xs font-semibold">{fontScale}%</span>
              </div>
              <input
                type="range"
                min={90}
                max={120}
                value={fontScale}
                onChange={(e) => setFontScale(Number(e.target.value))}
                className="w-full accent-skyBlue"
              />
            </div>

            {/* Vignette */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-skyBlue text-xs">Vignette</label>
                <span className="text-skyBlue text-xs font-semibold">{vignette}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={80}
                value={vignette}
                onChange={(e) => setVignette(Number(e.target.value))}
                className="w-full accent-skyBlue"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => { setChatBgUrl(''); setChatBgOpacity(30); setBlur(0); }}
                className="bg-white/10 text-skyBlue border border-white/10 hover:bg-white/15"
              >
                Reset
              </Button>
              <Button
                onClick={() => router.push('/dash')}
                className="ml-auto bg-skyBlue text-white hover:bg-skyBlue/80"
              >
                Save
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-2xl overflow-hidden bg-white/5 backdrop-blur-2xl border border-white/10 p-0">
            <div className="relative h-[420px]">
              {/* Image background */}
              <div
                className="absolute inset-0 bg-center bg-cover"
                style={{
                  backgroundImage: chatBgUrl ? `url(${chatBgUrl})` : undefined,
                  opacity: chatBgOpacity / 100,
                  filter: blur ? `blur(${blur}px)` : undefined,
                }}
              />
              {/* Theme gradient overlay */}
              {!useCustomGradient ? (
                <div className={`absolute inset-0 pointer-events-none bg-gradient-to-br ${themeOverlayClass}`} />
              ) : (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${fromColor}, ${viaColor}, ${toColor})`
                  }}
                />
              )}
              {/* Vignette overlay */}
              {vignette > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,${vignette/100}) 100%)`
                  }}
                />
              )}
              {/* Simulated chat area */}
              <div className="absolute inset-0 p-5 flex flex-col">
                <div className="mb-3 text-skyBlue font-semibold">Preview</div>
                <div className="flex-1 rounded-xl bg-black/40 border border-white/10 backdrop-blur-xl p-4 space-y-3 overflow-hidden">
                  {[
                    "Welcome to your theme!",
                    "Background looks subtle.",
                    "Opacity + blur help integrate it."
                  ].map((t, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10" />
                      <div>
                        <div className="text-white text-sm">User {i+1}</div>
                        <div className="text-gray-300 text-sm">{t}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
