import React, { useEffect, useRef, useState } from 'react'
import { Eraser, Check, RotateCcw } from 'lucide-react'

export type SignatureInputMethod = 'DRAW_MOUSE' | 'DRAW_TOUCH' | 'DRAW_STYLUS'

interface SignaturePadProps {
  label?: string
  value?: string
  onChange: (dataUrl: string, method: SignatureInputMethod) => void
  disabled?: boolean
  height?: number
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  label = 'Sign Here',
  value,
  onChange,
  disabled = false,
  height = 140,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastMethodRef = useRef<SignatureInputMethod>('DRAW_MOUSE')
  const [hasStrokes, setHasStrokes] = useState(Boolean(value))
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    setHasStrokes(Boolean(value))
  }, [value])

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const detectMethod = (pointerType: string): SignatureInputMethod => {
    if (pointerType === 'touch') return 'DRAW_TOUCH'
    if (pointerType === 'pen') return 'DRAW_STYLUS'
    return 'DRAW_MOUSE'
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || previewMode) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    lastMethodRef.current = detectMethod(e.pointerType)
    const { x, y } = getCoords(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineWidth = e.pointerType === 'pen' ? 2.2 : 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || disabled || previewMode) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoords(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasStrokes(true)
  }

  const finishStroke = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    onChange(dataUrl, lastMethodRef.current)
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
    setHasStrokes(false)
    setPreviewMode(false)
    onChange('', lastMethodRef.current)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <span style={{ fontWeight: 600, color: '#334155' }}>[ {label} ]</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {hasStrokes && value && (
            <button
              type="button"
              onClick={() => setPreviewMode((p) => !p)}
              className="pat-btn pat-btn-secondary"
              style={{ padding: '3px 9px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Check size={12} />
              {previewMode ? 'Redraw' : 'Preview'}
            </button>
          )}
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="pat-btn pat-btn-secondary"
            style={{ padding: '3px 9px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            {hasStrokes ? <RotateCcw size={12} /> : <Eraser size={12} />}
            Clear
          </button>
        </div>
      </div>

      {previewMode && value ? (
        <div
          style={{
            height: `${height}px`,
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
          }}
        >
          <img src={value} alt="Signature Preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={520}
            height={height}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
            data-testid="signature-pad-canvas"
            style={{
              width: '100%',
              height: `${height}px`,
              border: '1.5px dashed #94a3b8',
              borderRadius: '8px',
              background: '#ffffff',
              touchAction: 'none',
              cursor: disabled ? 'not-allowed' : 'crosshair',
              display: 'block',
            }}
          />
          {!hasStrokes && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                color: '#94a3b8',
                fontSize: '13px',
              }}
            >
              Draw signature using mouse, touch, or stylus
            </div>
          )}
        </div>
      )}
    </div>
  )
}
