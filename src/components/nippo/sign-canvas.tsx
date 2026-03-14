'use client'

import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react'

interface SignCanvasProps {
  onSignatureChange: (dataUrl: string | null) => void
}

export interface SignCanvasRef {
  clear: () => void
}

export const SignCanvas = forwardRef<SignCanvasRef, SignCanvasProps>(
  function SignCanvas({ onSignatureChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawingRef = useRef(false)
    const hasSignatureRef = useRef(false)
    const [showPlaceholder, setShowPlaceholder] = useState(true)

    const getCoordinates = useCallback((e: TouchEvent | MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return null

      const rect = canvas.getBoundingClientRect()

      if ('touches' in e) {
        const touch = e.touches[0]
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        }
      } else {
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        }
      }
    }, [])

    const stopDrawing = useCallback(() => {
      isDrawingRef.current = false

      if (hasSignatureRef.current && canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png')
        onSignatureChange(dataUrl)
      }
    }, [onSignatureChange])

    const startDrawing = useCallback((e: TouchEvent | MouseEvent) => {
      e.preventDefault()
      const coords = getCoordinates(e)
      if (!coords) return

      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return

      ctx.beginPath()
      ctx.moveTo(coords.x, coords.y)
      isDrawingRef.current = true
    }, [getCoordinates])

    const draw = useCallback((e: TouchEvent | MouseEvent) => {
      if (!isDrawingRef.current) return
      e.preventDefault()

      const coords = getCoordinates(e)
      if (!coords) return

      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return

      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
      if (!hasSignatureRef.current) {
        hasSignatureRef.current = true
        setShowPlaceholder(false)
      }
    }, [getCoordinates])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const updateSize = () => {
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * window.devicePixelRatio
        canvas.height = rect.height * window.devicePixelRatio
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }

      updateSize()
      window.addEventListener('resize', updateSize)

      // Use native event listeners with passive: false to allow preventDefault
      canvas.addEventListener('touchstart', startDrawing, { passive: false })
      canvas.addEventListener('touchmove', draw, { passive: false })
      canvas.addEventListener('touchend', stopDrawing)

      return () => {
        window.removeEventListener('resize', updateSize)
        canvas.removeEventListener('touchstart', startDrawing)
        canvas.removeEventListener('touchmove', draw)
        canvas.removeEventListener('touchend', stopDrawing)
      }
    }, [startDrawing, draw, stopDrawing])

    const clear = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      hasSignatureRef.current = false
      setShowPlaceholder(true)
      onSignatureChange(null)
    }, [onSignatureChange])

    useImperativeHandle(ref, () => ({
      clear,
    }))

    const handleMouseDown = (e: React.MouseEvent) => {
      const coords = getCoordinates(e.nativeEvent)
      if (!coords) return

      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return

      ctx.beginPath()
      ctx.moveTo(coords.x, coords.y)
      isDrawingRef.current = true
    }

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDrawingRef.current) return

      const coords = getCoordinates(e.nativeEvent)
      if (!coords) return

      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return

      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
      if (!hasSignatureRef.current) {
        hasSignatureRef.current = true
        setShowPlaceholder(false)
      }
    }

    return (
      <div className="relative h-full min-h-[200px] rounded-lg border-2 border-dashed border-gray-300 bg-white">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        {showPlaceholder && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-400">
            ここにサインしてください
          </div>
        )}
      </div>
    )
  }
)
