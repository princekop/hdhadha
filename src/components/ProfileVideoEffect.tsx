import React, { useEffect, useRef } from 'react'

// Draws a local mp4 to a canvas so the <video> element (and src) is not present in the DOM.
// This is an obfuscation, not a perfect DRM. It deters casual copying and right-click saving.
// Props:
// - src: string (path to mp4)
// - opacity: number (0-100)
// - className: string (positioning/size)
// - playing: boolean (start/stop rendering)

type Props = {
  src: string
  opacity?: number // 0-100
  className?: string
  playing?: boolean
}

export default function ProfileVideoEffect({ src, opacity = 60, className, playing = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Create a hidden video element in memory (not attached to DOM)
    const video = document.createElement('video')
    videoRef.current = video
    video.src = src
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.loop = true
    video.playsInline = true

    let isMounted = true

    const render = () => {
      if (!isMounted) return
      if (!canvasRef.current || !videoRef.current) return
      const v = videoRef.current
      const c = canvasRef.current
      const w = c.clientWidth || 1
      const h = c.clientHeight || 1
      if (c.width !== w || c.height !== h) {
        c.width = w
        c.height = h
      }
      if (!v.paused && !v.ended) {
        // Cover behavior: maintain aspect ratio and cover canvas
        const videoRatio = v.videoWidth / Math.max(1, v.videoHeight)
        const canvasRatio = w / h
        let drawW = w
        let drawH = h
        if (videoRatio > canvasRatio) {
          // video is wider
          drawH = h
          drawW = h * videoRatio
        } else {
          // video is taller
          drawW = w
          drawH = w / videoRatio
        }
        const dx = (w - drawW) / 2
        const dy = (h - drawH) / 2

        ctx.clearRect(0, 0, w, h)
        ctx.globalAlpha = Math.max(0, Math.min(1, opacity / 100))
        try {
          ctx.drawImage(v, dx, dy, drawW, drawH)
        } catch {}
      }
      rafRef.current = requestAnimationFrame(render)
    }

    const onCanPlay = async () => {
      try {
        await video.play()
      } catch {}
      rafRef.current = requestAnimationFrame(render)
    }

    const onError = () => {
      // noop: could log
    }

    if (playing) {
      video.addEventListener('canplay', onCanPlay)
      video.addEventListener('error', onError)
      // kick load
      video.load()
    }

    return () => {
      isMounted = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('error', onError)
      try {
        video.pause()
        // revoke src if blob
        if (video.src.startsWith('blob:')) URL.revokeObjectURL(video.src)
      } catch {}
      videoRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, playing])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ opacity: Math.max(0, Math.min(100, opacity)) / 100, pointerEvents: 'none', userSelect: 'none' }}
      aria-hidden
    />
  )
}
