import { useMemo } from 'react'
import { dateToX, MS_PER_DAY } from './graphLayout'
import { DUE_STATUS_COLOR_VAR, DUE_STATUS_LABEL, type DueStatusKey } from '../../utils/taskStatus'
import styles from './TimeAxis.module.css'

interface Tick {
  x: number
  label: string
  major: boolean
}

interface PeriodBand {
  x: number
  width: number
  label: string
  statusKey: DueStatusKey
}

const BAND_CLASS: Partial<Record<DueStatusKey, string>> = {
  'critical':  styles.bandCritical,
  'overdue':   styles.bandOverdue,
  'due-today': styles.bandDueToday,
  'due-soon':  styles.bandDueSoon,
  'upcoming':  styles.bandUpcoming,
}

function computePeriodBands(
  viewStart: Date,
  pixelsPerDay: number,
  canvasWidth: number,
): PeriodBand[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow       = new Date(today.getTime() + MS_PER_DAY)
  const sevenDaysAgo   = new Date(today.getTime() - 7 * MS_PER_DAY)
  const fifteenDaysOut = new Date(today.getTime() + 15 * MS_PER_DAY)

  const periods: { start: Date; end: Date; status: DueStatusKey }[] = [
    { start: new Date(-8640000000000000), end: sevenDaysAgo,   status: 'critical'  },
    { start: sevenDaysAgo,               end: today,           status: 'overdue'   },
    { start: today,                      end: tomorrow,        status: 'due-today' },
    { start: tomorrow,                   end: fifteenDaysOut,  status: 'due-soon'  },
    { start: fifteenDaysOut,             end: new Date(8640000000000000), status: 'upcoming' },
  ]

  return periods.flatMap(p => {
    const startX = Math.max(0, dateToX(p.start, viewStart, pixelsPerDay))
    const endX   = Math.min(canvasWidth, dateToX(p.end, viewStart, pixelsPerDay))
    if (endX <= startX) return []
    return [{ x: startX, width: endX - startX, label: DUE_STATUS_LABEL[p.status], statusKey: p.status }]
  })
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

  const bands = useMemo(
    () => computePeriodBands(viewStart, pixelsPerDay, canvasWidth),
    [viewStart, pixelsPerDay, canvasWidth],
  )

  return (
    <div
      className={`${styles.axis} ${position === 'bottom' ? styles.bottom : styles.top}`}
      style={{ width: canvasWidth }}
      aria-hidden="true"
    >
      {bands.map((band, i) => (
        <div
          key={`band-${i}`}
          className={`${styles.periodBand} ${BAND_CLASS[band.statusKey] ?? ''}`}
          style={{ left: band.x, width: band.width }}
        >
          <span
            className={styles.periodLabel}
            style={{ color: DUE_STATUS_COLOR_VAR[band.statusKey] }}
          >
            {band.label}
          </span>
        </div>
      ))}
      {ticks.map((tick, i) => (
        <div key={i} className={`${styles.tick} ${tick.major ? styles.major : ''}`} style={{ left: tick.x }}>
          <div className={styles.line} />
          {tick.major && <span className={styles.label}>{tick.label}</span>}
        </div>
      ))}
    </div>
  )
}
