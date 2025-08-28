import { Metadata } from 'next'
import ClientInvite from './ClientInvite'

type MetaServer = {
  id: string
  name: string
  description?: string
  banner?: string
  icon?: string
}

async function fetchMeta(code: string): Promise<MetaServer | null> {
  try {
    const res = await fetch(`/api/invites/${code}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const s = data?.server
    if (!s) return null
    return {
      id: s.id,
      name: s.name || 'Darkbyte Server',
      description: s.description || 'Join this community on Darkbyte',
      banner: s.banner || s.bannerUrl || '',
      icon: s.icon || s.iconUrl || ''
    }
  } catch {
    return null
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ code: string }> }
): Promise<Metadata> {
  const { code } = await params
  const meta = await fetchMeta(code)

  const title = meta ? `${meta.name} • Invite` : 'Join this server • Darkbyte'
  const description = meta?.description || 'Tap to join this community on Darkbyte.'
  const ogImage = `/invite/${code}/opengraph-image`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/invite/${code}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage]
    },
    other: {
      'theme-color': '#0b0d12'
    }
  }
}

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const meta = await fetchMeta(code)
  return <ClientInvite code={code} meta={meta || undefined} />
}
 