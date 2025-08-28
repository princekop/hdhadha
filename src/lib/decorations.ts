export type Decoration = {
  slug: string
  name: string
  filename: string
}

export const DECORATIONS: Decoration[] = [
  // Added from provided links
  { slug: 'open_beta', name: 'Open Beta', filename: 'open_beta.png' },
  { slug: 'disxcore_headset', name: 'Disxcore Headset', filename: 'disxcore_headset.png' },
  { slug: 'blue_smoke', name: 'Blue Smoke', filename: 'blue_smoke.png' },
  { slug: 'blue_hyper_helmet', name: 'Blue Hyper Helmet', filename: 'blue_hyper_helmet.png' },
  // External decorations (BNHA examples)
  {
    slug: 'tomura_shigaraki',
    name: 'Tomura Shigaraki',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/tomura_shigaraki.png',
  },
  {
    slug: 'shoto_todoroki',
    name: 'Shoto Todoroki',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/shoto_todoroki.png',
  },
  // User-requested CDN decorations (explicit URLs to preserve extensions)
  {
    slug: 'the_mark',
    name: 'The Mark',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/the_mark.png',
  },
  {
    slug: 'the_monster_you_created',
    name: 'The Monster You Created',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/the_monster_you_created.png',
  },
  {
    slug: 'magical_potion',
    name: 'Magical Potion',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/magical_potion.png',
  },
  {
    slug: 'crystal_ball_blue',
    name: 'Crystal Ball (Blue)',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/crystal_ball_blue.png',
  },
  {
    slug: 'ki_energy_blue',
    name: 'Ki Energy (Blue)',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/ki_energy_blue.png',
  },
  {
    slug: 'ki_energy',
    name: 'Ki Energy',
    filename:
      // Fixed path: `mdecorations` -> `decorations`
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/ki_energy.webp',
  },
  {
    slug: 'angry_yellow',
    name: 'Angry (Yellow)',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/angry_yellow.png',
  },
  {
    slug: 'phoenix',
    name: 'Phoenix',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/phoenix.png',
  },
  {
    slug: 'gelatinous_cube_blue',
    name: 'Gelatinous Cube (Blue)',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/gelatinous_cube_blue.png',
  },
  {
    slug: 'hood_crimson',
    name: 'Hood (Crimson)',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/hood_crimson.png',
  },
  {
    slug: 'witch_hat_midnight',
    name: 'Witch Hat (Midnight)',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/witch_hat_midnight.png',
  },
  {
    slug: 'oni_mask',
    name: 'Oni Mask',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/oni_mask.png',
  },
  {
    slug: 'spirit_embers',
    name: 'Spirit Embers',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/spirit_embers.png',
  },
  {
    slug: 'black_hole',
    name: 'Black Hole',
    filename:
      'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/black_hole.png',
  },
]

export function getDecorationBySlug(slug: string) {
  return DECORATIONS.find(d => d.slug === slug) || null
}

// Base CDN folder for decorations to auto-resolve unknown slugs
const CDN_DECOS_BASE =
  'https://cdn.jsdelivr.net/gh/itspi3141/discord-fake-avatar-decorations@main/public/decorations/'

// Returns a fully qualified image URL for a decoration slug.
// Priority:
// 1) Known in DECORATIONS: use its filename (may be URL or local file).
// 2) If slug itself looks like a URL, return it directly (allows passing a full URL as slug).
// 3) Otherwise, assume it's a file in the CDN decorations folder with .png extension.
export function getDecorationUrl(slug: string | null | undefined): string | null {
  if (!slug) return null
  const known = getDecorationBySlug(slug)
  if (known) {
    const f = known.filename
    return f.startsWith('http') ? f : `/decorations/${f}`
  }
  if (slug.startsWith('http://') || slug.startsWith('https://')) return slug
  return `${CDN_DECOS_BASE}${slug}.png`
}

// Optional per-decoration visual tweaks to keep overlays inside the circle nicely
// insetPct: percentage inset applied equally on all sides (0-12 usually)
export const DECORATION_STYLES: Record<string, { insetPct?: number }> = {
  // Some hats or wide shapes benefit from slightly more inset
  witch_hat_midnight: { insetPct: 11 },
  hood_crimson: { insetPct: 6 },
  phoenix: { insetPct: 6 },
  black_hole: { insetPct: 4 },
  ki_energy: { insetPct: 4 },
}
