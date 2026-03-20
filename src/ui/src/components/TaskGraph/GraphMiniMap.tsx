import { useCallback, useEffect, useRef } from 'react'
import type { Task } from '../../services/tasks'
import { computeDueStatus, type DueStatusKey } from '../../utils/taskStatus'
import type { TaskPosition } from './graphLayout'
import { CARD_HEIGHT, dateToX, dateToY } from './graphLayout'
import { computePeriodBands } from './TimeAxis'
import styles from './GraphMiniMap.module.css'

const MAP_W = 200
const MAP_H = 120

// Hardcoded hex values matching the CSS custom properties in index.css
const STATUS_COLOR: Record<DueStatusKey, string> = {
  'none':      '#6b7280',
  'upcoming':  '#3b82f6',
  'due-soon':  '#16a34a',
  'due-today': '#ea580c',
  'overdue':   '#dc2626',
  'critical':  '#7f1d1d',
  'completed': '#a16207',
}

// Alpha for period band strips in mini-map (faint, on dark background)
const BAND_ALPHA: Partial<Record<DueStatusKey, number>> = {
  'critical':  0.22,
  'overdue':   0.20,
  'due-today': 0.22,
  'due-soon':  0.18,
  'upcoming':  0.14,
}

interface GraphMiniMapProps {
  /** Full canvas dimensions (px). */
  canvasWidth: number
  canvasHeight: number
  /** The scrollable container element. */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Whether the graph is in vertical (time-runs-top-to-bottom) mode. */
  vertical: boolean
  /** Current task positions in canvas space. */
  positions: Map<string, TaskPosition>
  /** Tasks (for status/colour lookup). */
  tasks: Task[]
  /** Graph view start date (for period bands and now-line positioning). */
  viewStart: Date
  /** Pixels per day zoom level (for period bands and now-line positioning). */
  pixelsPerDay: number
}

/**
 * A thumbnail overlay that shows the full graph extent and highlights the
 * currently visible viewport region.  Clicking or dragging on the mini-map
 * pans the main viewport to the corresponding position.
 */
export function GraphMiniMap({
  canvasWidth, canvasHeight, containerRef, vertical, positions, tasks, viewStart, pixelsPerDay,
}: GraphMiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Scale factors from canvas-space → mini-map space
  const scaleX = MAP_W / canvasWidth
  const scaleY = MAP_H / canvasHeight

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, MAP_W, MAP_H)

    // Background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.82)'
    ctx.fillRect(0, 0, MAP_W, MAP_H)

    // Period bands — faint coloured strips along the time axis
    const canvasAxisSize = vertical ? canvasHeight : canvasWidth
    const bands = computePeriodBands(viewStart, pixelsPerDay, canvasAxisSize)
    for (const band of bands) {
      const alpha = BAND_ALPHA[band.statusKey] ?? 0
      if (alpha === 0) continue
      const color = STATUS_COLOR[band.statusKey]
      ctx.fillStyle = color
      ctx.globalAlpha = alpha
      if (vertical) {
        // Time runs top-to-bottom: bands are horizontal strips
        const by = band.x * scaleY
        const bh = band.width * scaleY
        ctx.fillRect(0, by, MAP_W, bh)
      } else {
        // Time runs left-to-right: bands are vertical strips
        const bx = band.x * scaleX
        const bw = band.width * scaleX
        ctx.fillRect(bx, 0, bw, MAP_H)
      }
      ctx.globalAlpha = 1
    }

    // Task cards — draw before viewport shading so they show through
    const taskMap = new Map(tasks.map(t => [t.id, t]))
    for (const [id, pos] of positions) {
      const task = taskMap.get(id)
      if (!task) continue
      const status = computeDueStatus(task)
      const color = STATUS_COLOR[status]

      const mx = pos.x * scaleX
      const my = pos.y * scaleY
      const mw = Math.max(pos.width * scaleX, 2)
      const mh = Math.max((pos.height ?? CARD_HEIGHT) * scaleY, 2)

      ctx.fillStyle = color
      ctx.globalAlpha = 0.75
      ctx.beginPath()
      ctx.roundRect(mx, my, mw, mh, 1)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Viewport rect in mini-map space
    const vpX = container.scrollLeft  * scaleX
    const vpY = container.scrollTop   * scaleY
    const vpW = Math.min(container.clientWidth,  canvasWidth)  * scaleX
    const vpH = Math.min(container.clientHeight, canvasHeight) * scaleY

    // Shade outside the viewport
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)'
    // top
    ctx.fillRect(0, 0, MAP_W, vpY)
    // bottom
    ctx.fillRect(0, vpY + vpH, MAP_W, MAP_H - vpY - vpH)
    // left
    ctx.fillRect(0, vpY, vpX, vpH)
    // right
    ctx.fillRect(vpX + vpW, vpY, MAP_W - vpX - vpW, vpH)

    // Viewport border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(vpX, vpY, vpW, vpH)

    // Current-time indicator line
    const now = new Date()
    if (vertical) {
      const nowY = dateToY(now, viewStart, pixelsPerDay) * scaleY
      if (nowY >= 0 && nowY <= MAP_H) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.70)'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 2])
        ctx.beginPath()
        ctx.moveTo(0, nowY)
        ctx.lineTo(MAP_W, nowY)
        ctx.stroke()
        ctx.setLineDash([])
      }
    } else {
      const nowX = dateToX(now, viewStart, pixelsPerDay) * scaleX
      if (nowX >= 0 && nowX <= MAP_W) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.70)'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 2])
        ctx.beginPath()
        ctx.moveTo(nowX, 0)
        ctx.lineTo(nowX, MAP_H)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }
  }, [canvasWidth, canvasHeight, scaleX, scaleY, containerRef, positions, tasks, viewStart, pixelsPerDay, vertical])

  // Redraw whenever the container scrolls or resizes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('scroll', draw, { passive: true })
    const ro = new ResizeObserver(draw)
    ro.observe(container)
    draw()
    return () => {
      container.removeEventListener('scroll', draw)
      ro.disconnect()
    }
  }, [draw, containerRef])

  // Redraw when canvas dimensions or task data changes
  useEffect(() => { draw() }, [draw, canvasWidth, canvasHeight, positions, tasks])

  // Convert a mini-map pointer event to a canvas coordinate, then scroll the
  // container so that point is centred in the viewport.
  function scrollToMapPoint(mapX: number, mapY: number) {
    const container = containerRef.current
    if (!container) return
    const canvasX = mapX / scaleX
    const canvasY = mapY / scaleY
    container.scrollLeft = canvasX - container.clientWidth  / 2
    container.scrollTop  = canvasY - container.clientHeight / 2
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    scrollToMapPoint(e.clientX - rect.left, e.clientY - rect.top)

    function onMove(me: MouseEvent) {
      scrollToMapPoint(me.clientX - rect.left, me.clientY - rect.top)
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Suppress default scroll on wheel over the mini-map so it doesn't interfere
  // with the main canvas wheel zoom handler.
  function handleWheel(e: React.WheelEvent) {
    e.stopPropagation()
  }

  return (
    <div
      className={styles.miniMap}
      style={{ width: MAP_W, height: MAP_H }}
      aria-label="Graph mini-map"
      aria-hidden="true"
      role="presentation"
    >
      <canvas
        ref={canvasRef}
        width={MAP_W}
        height={MAP_H}
        className={styles.canvas}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      />
    </div>
  )
}
