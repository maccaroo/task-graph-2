import type { Task } from '../../services/tasks'

export const CARD_WIDTH = 180
export const CARD_HEIGHT = 52
export const ROW_HEIGHT = 64
export const CANVAS_PAD_X = 280
export const CANVAS_PAD_Y = 72   // time axis height (56px) + 16px gap
export const MS_PER_DAY = 86_400_000
const DATE_PAD_DAYS = 14

export function dateToX(date: Date | string, viewStart: Date, pixelsPerDay: number): number {
  const d = typeof date === 'string' ? new Date(date) : date
  return CANVAS_PAD_X + ((d.getTime() - viewStart.getTime()) / MS_PER_DAY) * pixelsPerDay
}

export function xToDate(x: number, viewStart: Date, pixelsPerDay: number): Date {
  return new Date(viewStart.getTime() + ((x - CANVAS_PAD_X) / pixelsPerDay) * MS_PER_DAY)
}

export function computeViewRange(tasks: Task[]): { viewStart: Date; viewEnd: Date } {
  const datedTasks = tasks.filter(t => t.startDate || t.endDate)

  let minMs = Date.now() - DATE_PAD_DAYS * MS_PER_DAY
  let maxMs = Date.now() + DATE_PAD_DAYS * MS_PER_DAY

  for (const t of datedTasks) {
    if (t.startDate) {
      const ms = new Date(t.startDate).getTime()
      if (ms < minMs) minMs = ms
      if (ms > maxMs) maxMs = ms
    }
    if (t.endDate) {
      const ms = new Date(t.endDate).getTime()
      if (ms < minMs) minMs = ms
      if (ms > maxMs) maxMs = ms
    }
  }

  return {
    viewStart: new Date(minMs - DATE_PAD_DAYS * MS_PER_DAY),
    viewEnd:   new Date(maxMs + DATE_PAD_DAYS * MS_PER_DAY),
  }
}

export interface TaskPosition {
  x: number
  y: number
  /** Rendered width of the card. Equal to CARD_WIDTH for single-constrained/unconstrained tasks;
   *  equals the date span (in pixels) for both-constrained tasks. */
  width: number
}

/** Returns the date at the end of the current Present period (start of next week). */
function presentWeekEnd(): Date {
  const now = new Date()
  const day = now.getDay()
  // Days until next Monday: Sunday (0) → 1, Monday (1) → 7, Tuesday (2) → 6, …
  const diff = day === 0 ? 1 : 8 - day
  const end = new Date(now)
  end.setDate(now.getDate() + diff)
  end.setHours(0, 0, 0, 0)
  return end
}

export function computeAutoLayout(
  tasks: Task[],
  viewStart: Date,
  pixelsPerDay: number,
): Map<string, TaskPosition> {
  const openEndedEndX = dateToX(presentWeekEnd(), viewStart, pixelsPerDay)

  // Sort by the card's left-edge anchor date so order is stable and independent of relationships.
  // Priority: startDate → endDate (end-only) → open-ended (no dates, placed last).
  const allOrdered = [...tasks].sort((a, b) => {
    const aMs = a.startDate ? new Date(a.startDate).getTime()
              : a.endDate   ? new Date(a.endDate).getTime()
              : Infinity
    const bMs = b.startDate ? new Date(b.startDate).getTime()
              : b.endDate   ? new Date(b.endDate).getTime()
              : Infinity
    return aMs - bMs
  })

  const positions = new Map<string, TaskPosition>()
  const rowMaxX: number[] = []

  for (const task of allOrdered) {
    let cardLeft: number
    let cardWidth: number

    if (task.startDate && task.endDate) {
      // Both constrained: span from start date to end date
      const startX = dateToX(task.startDate, viewStart, pixelsPerDay)
      const endX   = dateToX(task.endDate,   viewStart, pixelsPerDay)
      cardLeft  = startX
      cardWidth = endX - startX
    } else if (task.startDate) {
      // Start-only: start side aligns to start date, standard width
      cardLeft  = dateToX(task.startDate, viewStart, pixelsPerDay)
      cardWidth = CARD_WIDTH
    } else {
      // End-only or open-ended: end side aligns to endX, standard width
      const endX = task.endDate ? dateToX(task.endDate, viewStart, pixelsPerDay) : openEndedEndX
      cardLeft  = endX - CARD_WIDTH
      cardWidth = CARD_WIDTH
    }

    let row = 0
    while (row < rowMaxX.length && rowMaxX[row] > cardLeft - 16) row++
    rowMaxX[row] = cardLeft + cardWidth

    positions.set(task.id, {
      x: cardLeft,
      y: CANVAS_PAD_Y + row * ROW_HEIGHT,
      width: cardWidth,
    })
  }

  return positions
}

export function computeCanvasSize(
  viewStart: Date,
  viewEnd: Date,
  pixelsPerDay: number,
  numRows: number,
): { width: number; height: number } {
  const width = dateToX(viewEnd, viewStart, pixelsPerDay) + CANVAS_PAD_X
  const height = CANVAS_PAD_Y + Math.max(numRows, 1) * ROW_HEIGHT + CANVAS_PAD_Y
  return { width, height }
}
