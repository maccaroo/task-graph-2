import { useMemo } from 'react'
import { dateToX, MS_PER_DAY } from './graphLayout'
import styles from './TimeAxis.module.css'

interface Tick {
  x: number
  label: string
  major: boolean
}

function computeTicks(
  viewStart: Date,
  viewEnd: Date,
  pixelsPerDay: number,
  canvasWidth: number,
): Tick[] {
  let intervalMs: number
  let formatLabel: (d: Date) => string
  let majorEvery: number

  if (pixelsPerDay >= 80) {
    intervalMs = 6 * 60 * 60 * 1000
    formatLabel = d => `${String(d.getHours()).padStart(2, '0')}:00`
    majorEvery = 4
  } else if (pixelsPerDay >= 20) {
    intervalMs = MS_PER_DAY
    formatLabel = d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    majorEvery = 7
  } else if (pixelsPerDay >= 4) {
    intervalMs = 7 * MS_PER_DAY
    formatLabel = d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    majorEvery = 4
  } else if (pixelsPerDay >= 0.5) {
    intervalMs = 30 * MS_PER_DAY
    formatLabel = d => d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    majorEvery = 12
  } else {
    intervalMs = 365 * MS_PER_DAY
    formatLabel = d => String(d.getFullYear())
    majorEvery = 1
  }

  const snapped = Math.ceil(viewStart.getTime() / intervalMs) * intervalMs
  let t = new Date(snapped)
  const ticks: Tick[] = []
  let idx = 0

  while (t.getTime() <= viewEnd.getTime()) {
    const x = dateToX(t, viewStart, pixelsPerDay)
    if (x >= 0 && x <= canvasWidth) {
      ticks.push({ x, label: formatLabel(t), major: idx % majorEvery === 0 })
    }
    t = new Date(t.getTime() + intervalMs)
    idx++
  }

  return ticks
}

interface TimeAxisProps {
  viewStart: Date
  viewEnd: Date
  pixelsPerDay: number
  canvasWidth: number
  position?: 'top' | 'bottom'
}

export function TimeAxis({ viewStart, viewEnd, pixelsPerDay, canvasWidth, position = 'top' }: TimeAxisProps) {
  const ticks = useMemo(
    () => computeTicks(viewStart, viewEnd, pixelsPerDay, canvasWidth),
    [viewStart, viewEnd, pixelsPerDay, canvasWidth],
  )

  return (
    <div
      className={`${styles.axis} ${position === 'bottom' ? styles.bottom : styles.top}`}
      style={{ width: canvasWidth }}
      aria-hidden="true"
    >
      {ticks.map((tick, i) => (
        <div key={i} className={`${styles.tick} ${tick.major ? styles.major : ''}`} style={{ left: tick.x }}>
          <div className={styles.line} />
          <span className={styles.label}>{tick.label}</span>
        </div>
      ))}
    </div>
  )
}
