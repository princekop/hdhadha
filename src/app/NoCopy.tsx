'use client'

import { useEffect } from 'react'

export default function NoCopy() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      // Allow inside editable fields
      const target = e.target as HTMLElement | null
      const isEditable = target && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName))
      if (!isEditable) e.preventDefault()
    }

    const onDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName || ''
      // Prevent dragging images/videos/canvas which enables drag-save
      if (['IMG', 'VIDEO', 'CANVAS'].includes(tag)) {
        e.preventDefault()
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const ctrlOrCmd = e.ctrlKey || e.metaKey
      // Block common save/view-source/devtools shortcuts
      if (
        (ctrlOrCmd && ['s', 'u', 'p'].includes(e.key.toLowerCase())) || // save, view-source, print
        (ctrlOrCmd && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) || // devtools panels
        e.key === 'F12' // devtools
      ) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('dragstart', onDragStart)
    window.addEventListener('keydown', onKeyDown, { capture: true })

    return () => {
      window.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('dragstart', onDragStart)
      window.removeEventListener('keydown', onKeyDown, { capture: true } as any)
    }
  }, [])

  return null
}
