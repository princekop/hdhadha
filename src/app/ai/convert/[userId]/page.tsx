'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Play, Send, Code2, FilePlus2, Brain, Copy, Check, Maximize2, Minimize2 } from 'lucide-react'
import ChatPane from '@/components/ChatPane'

export default function AiConvertPage() {
  const { userId } = useParams<{ userId: string }>()
  const { data: session, status } = useSession()
  const router = useRouter()

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'chat' | 'code'>('chat')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<{ html?: boolean; css?: boolean; js?: boolean }>({})
  const [previewFull, setPreviewFull] = useState(false)
  const [rightView, setRightView] = useState<'preview' | 'code'>('preview')
  // provider and build controls
  const [provider, setProvider] = useState<'gemini' | 'deepseek'>('gemini')
  const [buildProject, setBuildProject] = useState(false)
  type Version = { id: string; label: string; codeHtml: string; codeCss: string; codeJs: string }
  const [versions, setVersions] = useState<Version[]>([])
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null)
  // typewriter state for progressive rendering
  const [typingAssistant, setTypingAssistant] = useState<{
    content: string
    codeHtml?: string
    codeCss?: string
    codeJs?: string
  } | null>(null)
  // preview console logs (errors)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [consoleLogs, setConsoleLogs] = useState<string[]>([])
  // orchestrator state (auto from chat)
  const [orcBusy, setOrcBusy] = useState(false)
  const [orcResult, setOrcResult] = useState<{url:string;projectId:string}|null>(null)
  const [orcLogs, setOrcLogs] = useState<string[]>([])
  const [projectFiles, setProjectFiles] = useState<{ path: string; exec?: string }[]>([])
  const [previewMode, setPreviewMode] = useState<'live'|'project'>('live')

  // code panes from last assistant message
  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i]
    }
    return null
  }, [messages])

  const htmlFinal = lastAssistant?.codeHtml || ''
  const cssFinal = lastAssistant?.codeCss || ''
  const jsFinal = lastAssistant?.codeJs || ''
  // If a saved version is active, display it; otherwise show live typing/current
  const activeVersion = useMemo(() => versions.find(v => v.id === activeVersionId) || null, [versions, activeVersionId])
  const html = activeVersion ? activeVersion.codeHtml : (typingAssistant?.codeHtml ?? htmlFinal)
  const css = activeVersion ? activeVersion.codeCss : (typingAssistant?.codeCss ?? cssFinal)
  const js = activeVersion ? activeVersion.codeJs : (typingAssistant?.codeJs ?? jsFinal)

  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return
    if (!session || session.user.id !== userId) {
      router.push('/login')
      return
    }

    const ensureConversation = async () => {
      const res = await fetch(`/api/ai/conversations?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setConversationId(data.id)
      }
    }
    ensureConversation()
  }, [session, status, userId, router])

  useEffect(() => {
    if (!conversationId) return
    const loadMessages = async () => {
      const res = await fetch(`/api/ai/conversations/${conversationId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    }
    loadMessages()
  }, [conversationId])

  // Replace missing assets with data URI to avoid 404 spam from generated code
  const fixAssets = (s: string) => {
    if (!s) return s
    const transparentPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
    return s
      .replace(/\/uploads\/leaves\/leaf[1-5]\.png/gi, transparentPng)
  }

  // Debounced live preview updates (efficient while typing). Inject error-forwarding script.
  useEffect(() => {
    const id = setTimeout(() => {
      if (!iframeRef.current) return
      const doc = iframeRef.current.contentDocument
      if (!doc) return
      const safeHtml = fixAssets(html || '')
      const safeCss = fixAssets(css || '')
      const safeJs = js || ''
      const bridge = `
        <script>
          (function(){
            const post = (level,msg,stack)=>{ try{ parent.postMessage({ __preview: true, level, msg, stack }, '*') }catch(e){} }
            const origErr = console.error
            console.error = function(){ post('error', Array.from(arguments).join(' ')); origErr && origErr.apply(console, arguments) }
            window.onerror = function(message, source, lineno, colno, error){ post('error', String(message), error && error.stack) }
          })();
        <\/script>
      `
      const full = `<!doctype html><html><head><meta charset="utf-8"/><style>${safeCss}</style></head><body>${safeHtml}${bridge}<script>${safeJs}<\/script></body></html>`
      doc.open(); doc.write(full); doc.close()
    }, 120)
    return () => clearTimeout(id)
  }, [html, css, js])

  // Listen for preview error messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d: any = e.data
      if (d && d.__preview) {
        setConsoleLogs(prev => [...prev, `[${d.level}] ${d.msg || ''}${d.stack ? '\n' + d.stack : ''}`].slice(-200))
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const send = async () => {
    if (!input.trim() || !userId) return
    setLoading(true)
    setError(null)
    try {
      const originalPrompt = input
      // optimistic user message
      const optimistic = { id: `tmp-${Date.now()}`, role: 'user', content: input }
      setMessages(prev => [...prev, optimistic])

      const res = await fetch(`/api/ai/generate?stream=1&provider=${encodeURIComponent(provider)}` as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, userId, prompt: input, mode, provider })
      })
      if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) {
        // Streaming path: parse SSE
        setTypingAssistant({ content: mode==='code' ? 'Thinking…\n' : '', codeHtml: '', codeCss: '', codeJs: '' })
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        let convoIdTmp: string | null = conversationId
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const parts = buf.split('\n\n')
          buf = parts.pop() || ''
          for (const part of parts) {
            const line = part.trim()
            if (!line.startsWith('data: ')) continue
            const json = line.slice(6)
            try {
              const evt = JSON.parse(json)
              if (evt.type === 'content') {
                setTypingAssistant(prev => ({ ...(prev||{content:''}), content: ((prev?.content)||'') + (evt.delta||'') }))
              } else if (evt.type === 'code') {
                if (evt.lang === 'html') setTypingAssistant(prev => ({ ...(prev||{content:''}), codeHtml: ((prev?.codeHtml)||'') + (evt.delta||'') }))
                if (evt.lang === 'css') setTypingAssistant(prev => ({ ...(prev||{content:''}), codeCss: ((prev?.codeCss)||'') + (evt.delta||'') }))
                if (evt.lang === 'js') setTypingAssistant(prev => ({ ...(prev||{content:''}), codeJs: ((prev?.codeJs)||'') + (evt.delta||'') }))
              } else if (evt.type === 'done') {
                convoIdTmp = evt.conversationId || convoIdTmp
              }
            } catch {}
          }
        }
        const cid = convoIdTmp || conversationId
        if (!conversationId && cid) setConversationId(cid)
        if (cid) {
          const mres = await fetch(`/api/ai/conversations/${cid}/messages`)
          if (mres.ok) setMessages(await mres.json())
          else setError('Failed to refresh messages')
        }
        setTypingAssistant(null)
      } else if (res.ok) {
        // Fallback non-stream JSON
        const data = await res.json()
        if (!conversationId) setConversationId(data.conversationId)
        const mres = await fetch(`/api/ai/conversations/${data.conversationId}/messages`)
        if (mres.ok) setMessages(await mres.json())
        else setError('Failed to refresh messages')
      } else {
        // Error
        const errText = await res.text().catch(() => '')
        try {
          const err = JSON.parse(errText)
          const parts = [err?.error, err?.status && `(${err.status})`, err?.details]
          setError(parts.filter(Boolean).join(' '))
        } catch {
          setError(errText || 'Request failed')
        }
      }
      setInput('')
      // Optionally trigger orchestrator build only when enabled
      if (buildProject) {
        setOrcBusy(true); setOrcResult(null); setOrcLogs([]); setPreviewMode('project')
        try {
          const res = await fetch('/api/ai/orchestrate?stream=1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, prompt: originalPrompt, agents: ['exec1','exec2','exec3','exec4','exec5'], performance: 'max_quality', projectName: 'AI Project' })
          })
          if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) {
            const reader = res.body!.getReader(); const decoder = new TextDecoder(); let buf = ''
            const push = (s:string)=> setOrcLogs(prev=>[...prev, s].slice(-500))
            while(true){
              const {done, value} = await reader.read(); if(done) break
              buf += decoder.decode(value, { stream: true })
              const parts = buf.split('\n\n'); buf = parts.pop() || ''
              for(const part of parts){
                const line = part.trim(); if(!line.startsWith('data: ')) continue
                try{
                  const evt = JSON.parse(line.slice(6))
                  if(evt.type==='designer_start') push('Designer: thinking…')
                  else if(evt.type==='designer_plan') push(`Designer: plan ready (${(evt.files||[]).length} files)`) 
                  else if(evt.type==='executor_start') push(`Executor ${evt.exec}: starting ${evt.file}`)
                  else if(evt.type==='executor_done') push(`Executor: done ${evt.file}`)
                  else if(evt.type==='executor_error') push(`Executor error ${evt.file}: ${evt.status}`)
                  else if(evt.type==='done'){ setOrcResult({ url: evt.url, projectId: evt.projectId }); push('Build complete ✅') }
                  else if(evt.type==='error'){ push(`Error: ${evt.message}`) }
                }catch{}
              }
            }
          } else if (!res.ok) {
            const t = await res.text(); setError(`Orchestrator failed: ${res.status} ${t.slice(0,200)}`)
          } else {
            const j = await res.json(); setOrcResult({ url: j.url, projectId: j.projectId }); setOrcLogs(l=>[...l, 'Build complete ✅'])
          }
        } finally {
          setOrcBusy(false)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') return null
  if (!session || session.user.id !== userId) return null

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white grid grid-rows-[auto,1fr]">
      <header className="p-4 border-b border-white/10 flex items-center gap-3">
        <Brain className="text-cyan-300" />
        <h1 className="text-xl font-bold">Darkbyte AI</h1>
        <div className="ml-auto flex items-center gap-2">
          {/* Provider selector */}
          <div className="flex items-center gap-1 mr-2 text-xs">
            <span className="opacity-70">Provider:</span>
            <button
              className={`px-2 py-1 rounded border ${provider==='gemini'?'bg-white/10 border-white/20':'border-white/10 hover:bg-white/5'}`}
              onClick={()=>setProvider('gemini')}
              title="Use Gemini"
            >Gemini</button>
            <button
              className={`px-2 py-1 rounded border ${provider==='deepseek'?'bg-white/10 border-white/20':'border-white/10 hover:bg-white/5'}`}
              onClick={()=>setProvider('deepseek')}
              title="Use DeepSeek (Ollama)"
            >DeepSeek</button>
          </div>
          {/* Build toggle */}
          <label className="flex items-center gap-2 mr-2 text-xs">
            <input type="checkbox" checked={buildProject} onChange={e=>setBuildProject(e.target.checked)} />
            <span>Build project</span>
          </label>
          <button
            className={`px-3 py-1 rounded-lg border ${mode==='chat'?'bg-white/10 border-white/20':'border-white/10'}`}
            onClick={() => setMode('chat')}
          >Chat</button>
          <button
            className={`px-3 py-1 rounded-lg border ${mode==='code'?'bg-white/10 border-white/20':'border-white/10'}`}
            onClick={() => setMode('code')}
          >Code</button>
        </div>
      </header>

      {/* Orchestrator logs (auto from chat) */}
      {orcLogs.length>0 && (
        <section className="px-4 pt-3">
          <div className="text-xs bg-black/40 border border-white/10 rounded-lg p-2 max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-1">
            {orcLogs.map((l,i)=> (<div key={i} className="py-0.5">{l}</div>))}
            {orcResult && (
              <div className="pt-2">
                <a href={orcResult.url} target="_blank" className="text-cyan-300 underline">Open project</a>
              </div>
            )}
          </div>
        </section>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden relative">
        {/* Left: Chat (reusable) */}
        <ChatPane
          messages={messages as any}
          typingAssistant={typingAssistant ? { content: typingAssistant.content } : null}
          loading={loading}
          error={error}
          input={input}
          mode={mode}
          onInputChange={setInput}
          onSend={send}
          className="min-h-0"
          heightClass="h-[72vh]"
        />

        {/* Right: Tabbed Preview | Code (v0-style) */}
        <div className="flex flex-col min-h-0 bg-white/5 border border-white/10 rounded-xl overflow-hidden h-[72vh]">
          <div className="px-3 py-2 border-b border-white/10 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button
                className={`px-3 py-1 rounded-md ${rightView==='preview' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                onClick={() => setRightView('preview')}
              >Preview</button>
              <button
                className={`px-3 py-1 rounded-md ${rightView==='code' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                onClick={() => setRightView('code')}
              >Code</button>
            </div>
            {/* Versions */}
            <div className="hidden md:flex items-center gap-1">
              <button
                className={`px-2 py-1 rounded ${!activeVersion ? 'bg-white/10' : 'hover:bg-white/5'}`}
                onClick={() => setActiveVersionId(null)}
                title="Show current output"
              >Current</button>
              {versions.map(v => (
                <button key={v.id}
                  className={`px-2 py-1 rounded ${activeVersionId===v.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  onClick={() => setActiveVersionId(v.id)}
                  title={`Switch to ${v.label}`}
                >{v.label}</button>
              ))}
              <button
                className="px-2 py-1 rounded hover:bg-white/5 border border-white/10"
                onClick={() => {
                  const id = `v${versions.length+1}`
                  const label = id
                  const newV = { id, label, codeHtml: html || '', codeCss: css || '', codeJs: js || '' }
                  setVersions(prev => [...prev, newV])
                  setActiveVersionId(newV.id)
                }}
                title="Save current as a version"
              >Save</button>
            </div>
            {rightView==='preview' && (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 mr-2">
                  <button className={`px-2 py-0.5 rounded ${previewMode==='live'?'bg-white/10':'hover:bg-white/5'}`} onClick={()=>setPreviewMode('live')}>Live</button>
                  <button className={`px-2 py-0.5 rounded ${previewMode==='project'?'bg-white/10':'hover:bg-white/5'}`} onClick={()=>setPreviewMode('project')}>Project</button>
                </div>
                <button
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/15"
                  onClick={() => setConsoleOpen(v => !v)}
                  title="Toggle console"
                >
                  {consoleOpen ? 'Hide Console' : 'Show Console'}
                </button>
                <button
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/15"
                  onClick={() => setPreviewFull(true)}
                  title="Open full screen"
                >
                  <Maximize2 className="w-3 h-3" /> Fullscreen
                </button>
              </div>
            )}
          </div>

          {/* Body */}
          {rightView==='preview' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              {/* In project mode, load the built project's index; else show live-constructed preview */}
              {previewMode==='project' && orcResult ? (
                <iframe src={orcResult.url} className="w-full flex-1 bg-black" title="Project Preview" />
              ) : (
                <iframe ref={iframeRef} className="w-full flex-1 bg-black" title="Live Preview" />
              )}
              {consoleOpen && (
                <div className="h-32 border-t border-white/10 bg-black/60 overflow-y-auto text-xs p-2 font-mono">
                  {consoleLogs.length === 0 ? (
                    <div className="opacity-60">No errors</div>
                  ) : (
                    consoleLogs.map((l, i) => (
                      <div key={i} className="text-red-300 whitespace-pre-wrap break-words">{l}</div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 flex-1 min-h-0 divide-x divide-white/10">
              {/* HTML */}
              <div className="flex flex-col min-h-0">
                <div className="flex items-center justify-between px-2 py-1 text-xs border-b border-white/10">
                  <span className="opacity-80">HTML</span>
                  <button
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/15"
                    onClick={async () => {
                      await navigator.clipboard.writeText(html || '')
                      setCopied({ html: true }); setTimeout(() => setCopied({}), 1200)
                    }}
                    title="Copy HTML"
                  >
                    {copied.html ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied.html ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <textarea className="flex-1 p-2 bg-black/40 outline-none" value={html} readOnly placeholder="HTML" />
              </div>
              {/* CSS */}
              <div className="flex flex-col min-h-0">
                <div className="flex items-center justify-between px-2 py-1 text-xs border-b border-white/10">
                  <span className="opacity-80">CSS</span>
                  <button
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/15"
                    onClick={async () => {
                      await navigator.clipboard.writeText(css || '')
                      setCopied({ css: true }); setTimeout(() => setCopied({}), 1200)
                    }}
                    title="Copy CSS"
                  >
                    {copied.css ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied.css ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <textarea className="flex-1 p-2 bg-black/40 outline-none" value={css} readOnly placeholder="CSS" />
              </div>
              {/* JS */}
              <div className="flex flex-col min-h-0">
                <div className="flex items-center justify-between px-2 py-1 text-xs border-b border-white/10">
                  <span className="opacity-80">JS</span>
                  <button
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/15"
                    onClick={async () => {
                      await navigator.clipboard.writeText(js || '')
                      setCopied({ js: true }); setTimeout(() => setCopied({}), 1200)
                    }}
                    title="Copy JS"
                  >
                    {copied.js ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied.js ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <textarea className="flex-1 p-2 bg-black/40 outline-none" value={js} readOnly placeholder="JS" />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Fullscreen preview overlay */}
      {previewFull && (
        <div className="fixed inset-0 z-50 bg-black/90">
          <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between text-sm">
            <div className="opacity-80">Live Preview</div>
            <button
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/15"
              onClick={() => setPreviewFull(false)}
            >
              <Minimize2 className="w-4 h-4" /> Close
            </button>
          </div>
          <iframe ref={iframeRef} className="w-full h-[calc(100%-3rem)] bg-black" title="Preview Fullscreen" />
        </div>
      )}
    </div>
  )
}
