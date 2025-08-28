'use client'

import { useState, useRef, useEffect } from 'react'
import { GripVertical } from 'lucide-react'

interface ResizeHandleProps {
  onResize: (width: number) => void
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
}

export default function ResizeHandle({
  onResize,
  minWidth = 200,
  maxWidth = 500,
  defaultWidth = 320
}: ResizeHandleProps) {
  // Don't show resize handle on mobile devices
  const [isMobile, setIsMobile] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startWidth, setStartWidth] = useState(defaultWidth)
  const handleRef = useRef<HTMLDivElement>(null)

  // Track viewport to determine mobile state (unconditional hook)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isMobile) return // don't attach listeners on mobile
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const deltaX = e.clientX - startX
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX))
      
      onResize(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isMobile, isResizing, startX, startWidth, minWidth, maxWidth, onResize])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    setStartX(e.clientX)
    setStartWidth(handleRef.current?.parentElement?.offsetWidth || defaultWidth)
  }

  if (isMobile) return null

  return (
    <div
      ref={handleRef}
      className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-purple-500/50 cursor-col-resize transition-colors duration-200 group z-20"
      onMouseDown={handleMouseDown}
    >
      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-purple-500/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <GripVertical className="h-3 w-3 text-purple-300" />
      </div>
    </div>
  )
}