import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui'
import { type AvatarCrop } from '../../services/users'
import styles from './AvatarCropPicker.module.css'

interface CropBox {
  x: number
  y: number
  size: number
}

interface AvatarCropPickerProps {
  file: File
  uploading: boolean
  onConfirm: (crop: AvatarCrop | null) => void
  onCancel: () => void
}

export function AvatarCropPicker({ file, uploading, onConfirm, onCancel }: AvatarCropPickerProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [objectUrl, setObjectUrl] = useState('')
  const [crop, setCrop] = useState<CropBox | null>(null)

  // image display dimensions stored in a ref so drag closures always see current values
  const imgDims = useRef({ w: 0, h: 0, natW: 0, natH: 0 })

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleImgLoad() {
    const img = imgRef.current
    if (!img) return
    const w = img.offsetWidth
    const h = img.offsetHeight
    imgDims.current = { w, h, natW: img.naturalWidth, natH: img.naturalHeight }
    const size = Math.min(w, h)
    setCrop({ x: Math.round((w - size) / 2), y: Math.round((h - size) / 2), size })
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    if (!crop) return
    const startX = e.clientX
    const startY = e.clientY
    const startBoxX = crop.x
    const startBoxY = crop.y

    function onMove(ev: MouseEvent) {
      const { w, h } = imgDims.current
      setCrop(c => {
        if (!c) return c
        const nx = Math.max(0, Math.min(w - c.size, startBoxX + ev.clientX - startX))
        const ny = Math.max(0, Math.min(h - c.size, startBoxY + ev.clientY - startY))
        return { ...c, x: Math.round(nx), y: Math.round(ny) }
      })
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function handleConfirm() {
    if (!crop) { onConfirm(null); return }
    const { w, natW, h, natH } = imgDims.current
    if (!w || !h) { onConfirm(null); return }
    const scaleX = natW / w
    const scaleY = natH / h
    onConfirm({
      x: Math.round(crop.x * scaleX),
      y: Math.round(crop.y * scaleY),
      width: Math.round(crop.size * scaleX),
      height: Math.round(crop.size * scaleY),
    })
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.hint}>Drag the box to select your crop area</p>

      <div className={styles.canvas}>
        {objectUrl && (
          <img
            ref={imgRef}
            src={objectUrl}
            alt="Upload preview"
            className={styles.preview}
            onLoad={handleImgLoad}
            draggable={false}
          />
        )}
        {crop && (
          <>
            {/* Dark overlay — 4 rectangles around the crop box */}
            <div className={styles.overlay} style={{ top: 0, left: 0, right: 0, height: crop.y }} />
            <div className={styles.overlay} style={{ top: crop.y, left: 0, width: crop.x, height: crop.size }} />
            <div className={styles.overlay} style={{ top: crop.y, left: crop.x + crop.size, right: 0, height: crop.size }} />
            <div className={styles.overlay} style={{ top: crop.y + crop.size, left: 0, right: 0, bottom: 0 }} />
            {/* Crop box border */}
            <div
              className={styles.cropBox}
              style={{ left: crop.x, top: crop.y, width: crop.size, height: crop.size }}
              onMouseDown={handleMouseDown}
              aria-label="Crop area — drag to reposition"
              role="slider"
            />
          </>
        )}
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={uploading}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={uploading || !crop}>
          {uploading ? 'Uploading…' : 'Crop & upload'}
        </Button>
      </div>
    </div>
  )
}
