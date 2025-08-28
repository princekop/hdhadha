import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { DECORATIONS } from '@/lib/decorations'

export async function GET() {
  const session = await getServerSession(authOptions as any)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ items: DECORATIONS.map((d) => ({ slug: d.slug, name: d.name })) })
}
