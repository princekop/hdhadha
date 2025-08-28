import { NextRequest, NextResponse } from 'next/server'
import { getDecorationBySlug } from '@/lib/decorations'
import path from 'path'
import { promises as fs } from 'fs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const deco = getDecorationBySlug(slug)

  // Helper to determine content type from extension or header
  const contentTypeFromExt = (filenameOrUrl: string, fallback?: string) => {
    const ext = path.extname(filenameOrUrl.split('?')[0]).toLowerCase()
    if (ext === '.svg') return 'image/svg+xml'
    if (ext === '.gif') return 'image/gif'
    if (ext === '.webp') return 'image/webp'
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
    if (ext === '.png') return 'image/png'
    return fallback || 'application/octet-stream'
  }

  try {
    if (deco) {
      const f = deco.filename
      if (f.startsWith('http://') || f.startsWith('https://')) {
        // Proxy remote asset
        const r = await fetch(f, { cache: 'no-store' })
        if (!r.ok) return NextResponse.json({ error: 'Upstream not found' }, { status: 404 })
        const arrayBuf = await r.arrayBuffer()
        const ct = r.headers.get('content-type') || contentTypeFromExt(f, 'image/png')
        return new NextResponse(arrayBuf, {
          status: 200,
          headers: {
            'Content-Type': ct,
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Content-Disposition': `inline; filename="${path.basename(f)}"`,
            'X-Content-Type-Options': 'nosniff',
            'Cross-Origin-Resource-Policy': 'same-origin',
          },
        })
      } else {
        // Serve from local public/decorations
        const filePath = path.join(process.cwd(), 'public', 'decorations', f)
        const file = await fs.readFile(filePath)
        const contentType = contentTypeFromExt(f, 'image/png')
        return new NextResponse(new Uint8Array(file), {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=0, must-revalidate',
            'Content-Disposition': `inline; filename="${f}"`,
            'X-Content-Type-Options': 'nosniff',
            'Cross-Origin-Resource-Policy': 'same-origin',
          },
        })
      }
    }

    // Fallback: if slug is unknown, try CDN with .png
    const fallbackUrl = `https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/${slug}.png`
    const r = await fetch(fallbackUrl, { cache: 'no-store' })
    if (!r.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const arrayBuf = await r.arrayBuffer()
    const ct = r.headers.get('content-type') || contentTypeFromExt(fallbackUrl, 'image/png')
    return new NextResponse(arrayBuf, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Disposition': `inline; filename="${slug}.png"`,
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Decoration not available' }, { status: 404 })
  }
}
