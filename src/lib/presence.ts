export type BasePresence = 'online' | 'idle' | 'dnd' | 'offline' | 'invisible'

export function computeEffectivePresence(base: BasePresence, opts?: { isSelf?: boolean; now?: Date; isVisible?: boolean }): BasePresence {
  const isSelf = !!opts?.isSelf
  const now = opts?.now ?? new Date()
  const hour = now.getHours()
  const isNight = hour >= 22 || hour < 6
  const isVisible = typeof document !== 'undefined' ? (opts?.isVisible ?? (document.visibilityState === 'visible' && document.hasFocus())) : !!opts?.isVisible

  if (!isSelf) return base
  if (base === 'dnd') return 'dnd'
  if (isVisible) return 'online'
  if (isNight) return 'idle'
  return 'invisible'
}

export function presenceColorClass(p: BasePresence): string {
  switch (p) {
    case 'online':
      return 'bg-green-500'
    case 'idle':
      return 'bg-yellow-500'
    case 'dnd':
      return 'bg-red-500'
    case 'offline':
    case 'invisible':
    default:
      return 'bg-gray-500'
  }
}
