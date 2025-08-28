import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getModel } from '@/lib/aiKeys'
import { rlGenerate, keyFromRequest } from '@/lib/rate-limit'

// Next.js route settings
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// System policy: never reveal provider; always identify as Darkbyte
const SYSTEM_INSTRUCTION = `
You are Darkbyte, an AI assistant. Never reveal model/provider names or internal implementation details.
If asked "who made you" or similar, answer: "Made by Darkbyte."
When asked to generate front-end code, produce clean HTML/CSS/JS. If assets are requested, include a list of assets with names and contents or URLs.
When asked to build multi-file structure, propose a tree and return files with paths and contents.
Keep responses concise unless explicitly asked for detail.
`

// Best-effort sanitizer to avoid provider/model self-identification leaking to users.
function sanitizeText(s: string): string {
  if (!s) return s
  let out = s
  // Replace common provider/model mentions with app persona
  out = out.replace(/deep\s*seek/gi, 'Darkbyte')
  out = out.replace(/gemini/gi, 'Darkbyte')
  out = out.replace(/google(?:\s+ai)?/gi, 'Darkbyte')
  out = out.replace(/openai/gi, 'Darkbyte')
  // Tone down long self-introductions
  out = out.replace(/^(\s*)I am[^\n]{0,180}(?:\.|!)/i, '$1I am Darkbyte.')
  return out
}

type GenerateBody = {
  conversationId?: string
  userId: string
  prompt: string
  mode?: 'chat' | 'code'
  provider?: 'gemini' | 'deepseek'
}

export async function POST(req: NextRequest) {
  try {
    // Prefer executor keys (5..1) then generic, then bot key
    const apiKey = process.env.GEMINI_API_KEY_5
      || process.env.GEMINI_API_KEY_4
      || process.env.GEMINI_API_KEY_3
      || process.env.GEMINI_API_KEY_2
      || process.env.GEMINI_API_KEY_1
      || process.env.GEMINI_API_KEY
      || process.env.GEMINI_BOT_KEY
    const ollamaBase = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const ollamaModel = process.env.OLLAMA_MODEL || 'deepseek-coder:latest'

    const body = (await req.json()) as GenerateBody
    // Basic input validation and limits
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
    if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
    if (body.prompt.length > 4000) {
      return NextResponse.json({ error: 'prompt too long (max 4000 chars)' }, { status: 413, headers: { 'Cache-Control': 'no-store' } })
    }
    if (body.mode && !['chat', 'code'].includes(body.mode)) {
      return NextResponse.json({ error: 'invalid mode' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
    if (body.provider && !['gemini', 'deepseek'].includes(body.provider)) {
      return NextResponse.json({ error: 'invalid provider' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
    const qpProvider = req.nextUrl.searchParams.get('provider') as 'gemini' | 'deepseek' | null
    const provider = (body.provider || qpProvider || null) as 'gemini' | 'deepseek' | null
    const useOllama = provider === 'deepseek' ? true : provider === 'gemini' ? false : !apiKey
    if (useOllama && !ollamaBase) {
      return NextResponse.json({ error: 'No AI provider configured (set GEMINI_API_KEY_* or OLLAMA_BASE_URL)' }, { status: 500 })
    }

    const { conversationId, userId, prompt, mode = 'chat' } = body

    // Rate limit per IP/UA
    const rlKey = keyFromRequest(req as unknown as Request)
    if (!(await rlGenerate.take(rlKey))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Cache-Control': 'no-store' } })
    }

    if (!userId || !prompt) {
      return NextResponse.json({ error: 'userId and prompt are required' }, { status: 400 })
    }

    // Ensure user exists to avoid FK errors
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }

    // Create conversation if not provided
    let convoId = conversationId
    if (!convoId) {
      const convo = await prisma.aiConversation.create({
        data: { userId, title: prompt.slice(0, 48) || 'New AI Chat' },
        select: { id: true }
      })
      convoId = convo.id
    }

    // Persist user message
    await prisma.aiMessage.create({
      data: { conversationId: convoId!, role: 'user', content: prompt }
    })

    // Build messages context
    const messages = await prisma.aiMessage.findMany({
      where: { conversationId: convoId! },
      orderBy: { createdAt: 'asc' },
      take: 30,
      select: { role: true, content: true }
    })

    // Build contents with explicit roles; latest messages already include the user's prompt we just saved
    const contents = [
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: `Mode: ${mode}` }] },
    ]

    let text = ''
    let codeHtml: string | null = null
    let codeCss: string | null = null
    let codeJs: string | null = null

    if (!useOllama) {
      const model = getModel()
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      const payload = {
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
      }
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey!,
        },
        body: JSON.stringify(payload),
      })
      if (!resp.ok) {
        const errText = await resp.text()
        return NextResponse.json({ error: 'Upstream AI request failed', status: resp.status, details: errText?.slice(0, 2000) }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
      }
      const data: any = await resp.json()
      text =
        data?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p?.text === 'string')?.text ||
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'No response.'
    } else {
      // Ollama non-streamed call handled below only if not using SSE; for now we compute text after streaming branch
      text = '' // will be set later if not streaming
    }

    // Naive parse for code blocks; if mode is code, try to split out code
    const extractBlocks = (t: string) => {
      if (mode !== 'code') return { h: null as string | null, c: null as string | null, j: null as string | null }
      const extract = (lang: string) => {
        const re = new RegExp("```" + lang + "\n([\u0000-\uFFFF]*?)```", 'm')
        const m = t.match(re)
        return m ? m[1].trim() : null
      }
      return { h: extract('html'), c: extract('css'), j: extract('js') }
    }
    ;({ h: codeHtml, c: codeCss, j: codeJs } = extractBlocks(text))

    // If client requested streaming, emit SSE with progressive chunks
    const isStream = req.nextUrl.searchParams.get('stream') === '1'
    if (isStream) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream<Uint8Array>({
        start: async (controller) => {
          const send = (obj: any) => {
            const s = `data: ${JSON.stringify(obj)}\n\n`
            controller.enqueue(encoder.encode(s))
          }
          const streamWords = async (s: string, type: string, extra: any = {}, delayMs = 18) => {
            const words = s.split(/(\s+)/)
            for (const w of words) {
              if (!w) continue
              send({ type, delta: w, ...extra })
              await new Promise(r => setTimeout(r, delayMs))
            }
          }
          // Accumulate full content to persist
          let full = ''

          if (!useOllama) {
            const safe = sanitizeText(text || 'No response.')
            await streamWords(safe, 'content', {}, 20)
            full = safe
            if (mode === 'code') {
              if (codeHtml) await streamWords(codeHtml, 'code', { lang: 'html' }, 8)
              if (codeCss) await streamWords(codeCss, 'code', { lang: 'css' }, 8)
              if (codeJs) await streamWords(codeJs, 'code', { lang: 'js' }, 8)
            }
          } else {
            // Stream from Ollama
            const prompt = `${SYSTEM_INSTRUCTION}\n\nMode: ${mode}\n\n` + messages.map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
            const o = await fetch(`${ollamaBase}/api/generate`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: ollamaModel, prompt, stream: true })
            })
            if (!o.ok || !o.body) {
              send({ type: 'error', message: `Ollama error ${o.status}` })
            } else {
              const reader = o.body.getReader()
              const decoder = new TextDecoder()
              let buf = ''
              while (true) {
                const { value, done } = await reader.read()
                if (done) break
                buf += decoder.decode(value, { stream: true })
                const lines = buf.split('\n')
                buf = lines.pop() || ''
                for (const line of lines) {
                  if (!line.trim()) continue
                  try {
                    const j = JSON.parse(line)
                    const delta = j?.response || ''
                    if (delta) {
                      const clean = sanitizeText(delta)
                      full += clean
                      send({ type: 'content', delta: clean })
                    }
                    if (j?.done) break
                  } catch {}
                }
              }
            }
          }

          // Extract code blocks from the accumulated text if needed
          if (mode === 'code') {
            const blocks = extractBlocks(full)
            codeHtml = blocks.h
            codeCss = blocks.c
            codeJs = blocks.j
          }

          // Persist once done
          const assistantMessage = await prisma.aiMessage.create({
            data: {
              conversationId: convoId!,
              role: 'assistant',
              content: sanitizeText(full),
              codeHtml: codeHtml || undefined,
              codeCss: codeCss || undefined,
              codeJs: codeJs || undefined,
            },
            select: { id: true }
          })

          send({ type: 'done', conversationId: convoId, messageId: assistantMessage.id })
          controller.close()
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    const assistantMessage = await prisma.aiMessage.create({
      data: {
        conversationId: convoId!,
        role: 'assistant',
        content: text,
        codeHtml: codeHtml || undefined,
        codeCss: codeCss || undefined,
        codeJs: codeJs || undefined,
      },
    })

    if (!useOllama) {
      return NextResponse.json({ conversationId: convoId, message: assistantMessage }, { headers: { 'Cache-Control': 'no-store' } })
    } else {
      // If Ollama and not streaming, do a non-stream call now
      if (!text) {
        const prompt = `${SYSTEM_INSTRUCTION}\n\nMode: ${mode}\n\n` + messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
        const o = await fetch(`${ollamaBase}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: ollamaModel, prompt, stream: false }) })
        if (o.ok) {
          const j = await o.json(); text = sanitizeText(j?.response || '')
          ;({ h: codeHtml, c: codeCss, j: codeJs } = extractBlocks(text))
          await prisma.aiMessage.update({ where: { id: assistantMessage.id }, data: { content: text, codeHtml: codeHtml || undefined, codeCss: codeCss || undefined, codeJs: codeJs || undefined } })
        }
      }
      return NextResponse.json({ conversationId: convoId, message: { ...assistantMessage, content: text } }, { headers: { 'Cache-Control': 'no-store' } })
    }
  } catch (e: any) {
    // Provide more actionable error details without leaking internals
    const msg = typeof e?.message === 'string' ? e.message : 'Unknown error'
    console.error('AI generate error', e)
    if (msg.includes('Foreign key')) {
      return NextResponse.json({ error: 'Invalid reference (check userId and conversationId)' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error', details: msg?.slice(0, 500) }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
