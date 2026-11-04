import { useEffect, useRef } from 'react'
import { decode } from 'blurhash'

interface BlurhashCanvasProps {
  hash: string
  className?: string
}

const SIZE = 32

export default function BlurhashCanvas({
  hash,
  className,
}: BlurhashCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const pixels = decode(hash, SIZE, SIZE)
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const imageData = ctx.createImageData(SIZE, SIZE)
      imageData.data.set(pixels)
      ctx.putImageData(imageData, 0, 0)
    } catch {
      // Invalid blurhash — fail silently
    }
  }, [hash])

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full object-cover${className ? ` ${className}` : ''}`}
    />
  )
}
