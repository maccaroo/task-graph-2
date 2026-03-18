import type { Task } from '../../services/tasks'
import { MS_PER_DAY } from './graphLayout'

const SNAP_THRESHOLD_PX = 8

/** Returns the tick interval in milliseconds matching the current zoom level. */
function getTickIntervalMs(pixelsPerDay: number): number {
  if (pixelsPerDay >= 80)  return MS_PER_DAY * 0.25  // 6-hour ticks
  if (pixelsPerDay >= 20)  return MS_PER_DAY           // daily
  if (pixelsPerDay >= 4)   return MS_PER_DAY * 7       // weekly
  if (pixelsPerDay >= 0.5) return MS_PER_DAY * 30      // monthly (approx)
  return MS_PER_DAY * 365                              // yearly (approx)
}

/**
 * Snaps a raw date to the nearest time-axis tick or task date boundary,
 * within SNAP_THRESHOLD_PX pixels. Task-date snapping takes priority when
 * both a tick and a task date are within the threshold (closest wins).
 *
 * @param rawDate      The unsnapped date to consider
 * @param pixelsPerDay Current zoom level
 * @param otherTasks   Other tasks whose start/end dates are snap targets
 */
export function snapDate(
  rawDate: Date,
  pixelsPerDay: number,
  otherTasks: Task[],
): Date {
  const intervalMs = getTickIntervalMs(pixelsPerDay)
  const rawMs = rawDate.getTime()

  // Nearest tick
  const tickMs = Math.round(rawMs / intervalMs) * intervalMs
  const tickDistPx = (Math.abs(rawMs - tickMs) / MS_PER_DAY) * pixelsPerDay

  // Nearest task date
  let bestTaskMs: number | null = null
  let bestTaskDistPx = SNAP_THRESHOLD_PX

  for (const task of otherTasks) {
    for (const dateStr of [task.startDate, task.endDate]) {
      if (!dateStr) continue
      const ms = new Date(dateStr).getTime()
      const distPx = (Math.abs(rawMs - ms) / MS_PER_DAY) * pixelsPerDay
      if (distPx < bestTaskDistPx) {
        bestTaskDistPx = distPx
        bestTaskMs = ms
      }
    }
  }

  // Prefer whichever snap target is closer
  if (bestTaskMs !== null && bestTaskDistPx <= tickDistPx) {
    return new Date(bestTaskMs)
  }
  if (tickDistPx <= SNAP_THRESHOLD_PX) {
    return new Date(tickMs)
  }
  return rawDate
}
