"use client"

import React, { useEffect, useRef } from "react"
import { Send } from "lucide-react"

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  codeHtml?: string | null
  codeCss?: string | null
  codeJs?: string | null
}

export type TypingState = {
  content: string
}

type Props = {
  messages: ChatMessage[]
  typingAssistant?: TypingState | null
  loading: boolean
  error?: string | null
  input: string
  mode: "chat" | "code"
  onInputChange: (value: string) => void
  onSend: () => void
  className?: string
  heightClass?: string // tailwind height utility, e.g. h-[70vh]
}

export default function ChatPane({
  messages,
  typingAssistant,
  loading,
  error,
  input,
  mode,
  onInputChange,
  onSend,
  className,
  heightClass = 'h-[70vh]',
}: Props) {
  const chatRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to bottom whenever messages or typing changes
  useEffect(() => {
    const el = chatRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, typingAssistant, loading])

  return (
    <div className={`flex flex-col min-h-0 ${heightClass} bg-white/5 border border-white/10 rounded-xl overflow-hidden ${className || ''}`}>
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`p-3 rounded-lg ${m.role === 'user' ? 'bg-cyan-900/20' : 'bg-white/10'}`}>
            <div className="text-xs opacity-70 mb-1">{m.role === 'user' ? 'You' : 'Darkbyte'}</div>
            <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>
            {(m.codeHtml || m.codeCss || m.codeJs) ? (
              <div className="mt-2 text-xs opacity-70">[Contains code]</div>
            ) : null}
          </div>
        ))}

        {typingAssistant && (
          <div className="p-3 rounded-lg bg-white/10">
            <div className="text-xs opacity-70 mb-1">Darkbyte</div>
            <div className="whitespace-pre-wrap break-words text-sm">{typingAssistant.content}</div>
          </div>
        )}

        {loading && !typingAssistant && (
          <div className="p-3 rounded-lg bg-white/10 animate-pulse">
            <div className="text-xs opacity-70 mb-1">Darkbyte</div>
            <div className="text-sm opacity-80">Replying…</div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-300 text-sm">{error}</div>
        )}
      </div>

      <div className="p-3 border-t border-white/10 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={mode === 'code' ? 'Describe the app or components to build...' : 'Ask Darkbyte...'}
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none text-base sm:text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
        />
        <button
          disabled={loading}
          onClick={onSend}
          className="px-4 py-3 rounded-xl bg-cyan-500 text-black font-semibold disabled:opacity-60 flex items-center gap-2 active:scale-[0.98] transition-transform"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
