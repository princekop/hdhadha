import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { getGeminiKey, getModel } from '@/lib/aiKeys'

const SYSTEM = `You are Darkbyte multi-agent. Roles:
- Designer: produce a project plan (tree of files with paths, brief descriptions, and which executor should implement each file). Output JSON only.
- Executor: given a file path, description, and global plan context, generate the exact file contents only with no commentary.
Rules:
- Use clean, responsive HTML/CSS/JS. Style: smoky black background with sky-blue accents. Mobile-first, responsive.
- Keep assets under /public/projects/{id}/assets if needed; otherwise embed.
- Keep code cohesive across files per plan; avoid placeholder TODOs.
- Never reveal model/provider names. Identify as Darkbyte only.`

// Types
interface OrchestrateBody {
  userId: string
  prompt: string
  agents?: Array<'exec1'|'exec2'|'exec3'|'exec4'|'exec5'>
  performance?: 'fast'|'balanced'|'max_quality'
  projectName?: string
}

type PlanFile = { path: string; desc: string; exec: 'exec1'|'exec2'|'exec3'|'exec4'|'exec5' }

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OrchestrateBody
    const { userId, prompt, agents = ['exec1','exec2','exec3','exec4','exec5'], performance = 'max_quality', projectName } = body

    if (!userId || !prompt) {
      return NextResponse.json({ error: 'userId and prompt are required' }, { status: 400 })
    }

    // Keys
    const designerKey = getGeminiKey('designer')
    if (!designerKey) return NextResponse.json({ error: 'GEMINI_API_KEY_PLAN_DESIGNER missing' }, { status: 500 })

    const activeExecs = agents.filter(a => !!getGeminiKey(a))
    const ollamaBase = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const ollamaModel = process.env.OLLAMA_MODEL || 'deepseek-coder:latest'
    if (activeExecs.length === 0 && !ollamaBase) return NextResponse.json({ error: 'No executor API keys available (and OLLAMA_BASE_URL not set)' }, { status: 500 })

    const isStream = req.nextUrl.searchParams.get('stream') === '1'

    // 1) Ask Designer for a plan
    const model = getModel()
    const planPrompt = {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [
        { role: 'user', parts: [{ text: `Create a project plan for: ${prompt}\nPerformance: ${performance}.\nReturn STRICT JSON as { files: [{ path, desc, exec }], notes?: string } where exec is one of: ${activeExecs.join(', ')}.\nREQUIRE: include a root-level index.html as the main entry point, and reference any CSS/JS/assets with relative paths.` }] },
      ],
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    const doPlan = async () => {
      const planResp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': designerKey },
        body: JSON.stringify(planPrompt),
      })
      if (!planResp.ok) {
        const t = await planResp.text()
        throw new Error(`Designer failed: ${planResp.status} ${t?.slice(0, 400)}`)
      }
      const planJson: any = await planResp.json()
      const planText: string = planJson?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const plan = safeJson(planText) || { files: [] as PlanFile[] }
      return { plan, planText }
    }

    // 2) Fan-out to Executors in parallel
    if (isStream) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream<Uint8Array>({
        start: async (controller) => {
          const send = (obj: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
          try {
            send({ type: 'designer_start' })
            const { plan, planText } = await doPlan()
            send({ type: 'designer_plan', files: plan.files })

            const projectId = `${Date.now()}-${randomUUID().slice(0,8)}`
            const baseDir = path.join(process.cwd(), 'public', 'projects', projectId)
            await mkdir(baseDir, { recursive: true })
            const files: { path: string; content: string; exec: string }[] = []

            for (const f of plan.files as PlanFile[]) {
              const execKey = getGeminiKey(f.exec)
              send({ type: 'executor_start', file: f.path, exec: f.exec })
              let text = ''
              if (execKey) {
                const contentReq = {
                  systemInstruction: { parts: [{ text: SYSTEM }] },
                  contents: [
                    { role: 'user', parts: [{ text: `Global Plan:\n${planText}\n\nGenerate ONLY the full contents for file: ${f.path}\nDescription: ${f.desc}\nNo commentary, just the file content.` }] } ,
                  ]
                }
                const resp = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-goog-api-key': execKey },
                  body: JSON.stringify(contentReq),
                })
                if (!resp.ok) {
                  const t = await resp.text()
                  send({ type: 'executor_error', file: f.path, status: resp.status, details: t?.slice(0,300) })
                  continue
                }
                const j: any = await resp.json()
                text = j?.candidates?.[0]?.content?.parts?.[0]?.text || ''
              } else {
                // Ollama fallback
                const prompt = `${SYSTEM}\n\nGlobal Plan:\n${planText}\n\nGenerate ONLY the full contents for file: ${f.path}\nDescription: ${f.desc}\nNo commentary, just the file content.`
                const o = await fetch(`${ollamaBase}/api/generate`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ model: ollamaModel, prompt, stream: false })
                })
                if (!o.ok) {
                  const t = await o.text()
                  send({ type: 'executor_error', file: f.path, status: o.status, details: t?.slice(0,300) })
                  continue
                }
                const j = await o.json()
                text = j?.response || ''
              }
              const clean = stripFences(text)
              const outPath = path.join(baseDir, f.path)
              await mkdir(path.dirname(outPath), { recursive: true })
              await writeFile(outPath, clean, 'utf8')
              files.push({ path: f.path, content: clean, exec: f.exec })
              send({ type: 'executor_done', file: f.path })
            }

            // Ensure index.html exists
            await ensureIndexHtml(baseDir, files)
            const manifest = { projectId, name: projectName || 'AI Project', prompt, performance, files: files.map(f => ({ path: f.path, exec: f.exec })) }
            await writeFile(path.join(baseDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
            const publicUrl = `/projects/${projectId}/index.html`
            send({ type: 'done', url: publicUrl, projectId })
          } catch (e: any) {
            send({ type: 'error', message: String(e?.message || e) })
          } finally {
            controller.close()
          }
        }
      })
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'Access-Control-Allow-Origin': '*' } })
    }

    // Non-stream path
    const { plan, planText } = await doPlan()
    const projectId = `${Date.now()}-${randomUUID().slice(0,8)}`
    const baseDir = path.join(process.cwd(), 'public', 'projects', projectId)
    await mkdir(baseDir, { recursive: true })
    const files: { path: string; content: string; exec: string }[] = []
    for (const f of plan.files as PlanFile[]) {
      const execKey = getGeminiKey(f.exec)
      let text = ''
      if (execKey) {
        const contentReq = {
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [
            { role: 'user', parts: [{ text: `Global Plan:\n${planText}\n\nGenerate ONLY the full contents for file: ${f.path}\nDescription: ${f.desc}\nNo commentary, just the file content.` }] } ,
          ]
        }
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-goog-api-key': execKey },
          body: JSON.stringify(contentReq),
        })
        if (!resp.ok) continue
        const j: any = await resp.json()
        text = j?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      } else {
        // Ollama fallback
        const prompt2 = `${SYSTEM}\n\nGlobal Plan:\n${planText}\n\nGenerate ONLY the full contents for file: ${f.path}\nDescription: ${f.desc}\nNo commentary, just the file content.`
        const o = await fetch(`${ollamaBase}/api/generate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: ollamaModel, prompt: prompt2, stream: false })
        })
        if (!o.ok) continue
        const j = await o.json(); text = j?.response || ''
      }
      const clean = stripFences(text)
      const outPath = path.join(baseDir, f.path)
      await mkdir(path.dirname(outPath), { recursive: true })
      await writeFile(outPath, clean, 'utf8')
      files.push({ path: f.path, content: clean, exec: f.exec })
    }
    // Ensure index.html exists
    await ensureIndexHtml(baseDir, files)
    const manifest = { projectId, name: projectName || 'AI Project', prompt, performance, files: files.map(f => ({ path: f.path, exec: f.exec })) }
    await writeFile(path.join(baseDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
    const publicUrl = `/projects/${projectId}/index.html`
    return NextResponse.json({ projectId, url: publicUrl, manifest, files })
  } catch (e: any) {
    console.error('orchestrate error', e)
    return NextResponse.json({ error: 'Internal error', details: String(e?.message || e).slice(0, 500) }, { status: 500 })
  }
}

function safeJson(s: string): any | null {
  try {
    // Try direct JSON first
    return JSON.parse(s)
  } catch {}
  // Try to extract JSON fence
  const m = s.match(/```json\n([\s\S]*?)```/)
  if (m) {
    try { return JSON.parse(m[1]) } catch {}
  }
  // Try to find first {...}
  const m2 = s.match(/\{[\s\S]*\}/)
  if (m2) {
    try { return JSON.parse(m2[0]) } catch {}
  }
  return null
}

function stripFences(s: string): string {
  const m = s.match(/^```[a-zA-Z]*\n([\s\S]*?)```$/)
  if (m) return m[1]
  return s
}

async function ensureIndexHtml(baseDir: string, files: { path: string }[]) {
  const hasIndex = files.some(f => /(^|\/)index\.html$/i.test(f.path))
  if (hasIndex) return
  // find first html file
  const html = files.find(f => f.path.toLowerCase().endsWith('.html'))
  let content = ''
  if (html) {
    // Create a simple redirect to the first HTML file
    const rel = html.path
    content = `<!doctype html><html><head><meta http-equiv="refresh" content="0; url=${rel}"><meta charset="utf-8"/></head><body><p>Redirecting to ${rel}…</p></body></html>`
  } else {
    // Minimal landing page listing files
    const links = files.map(f => `<li><a href="${f.path}">${f.path}</a></li>`).join('')
    content = `<!doctype html><html><head><meta charset="utf-8"/><title>Project</title><style>body{background:#0b0d12;color:#e6f6ff;font-family:Inter,system-ui,Arial} a{color:#67e8f9}</style></head><body><h1>Project</h1><ul>${links}</ul></body></html>`
  }
  await writeFile(path.join(baseDir, 'index.html'), content, 'utf8')
}
