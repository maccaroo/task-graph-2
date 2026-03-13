import type { Task } from '../services/tasks'

export type DueStatusKey =
  | 'none'        // no end date — open-ended
  | 'upcoming'    // long due  (> 14 days)  — blue
  | 'due-soon'    // soon due  (1–14 days)  — green
  | 'due-today'   // present   (today)      — orange
  | 'overdue'     // overdue   (1–7 days)   — red
  | 'critical'    // long overdue (> 7 days) — maroon
  | 'completed'   // complete                — gold

/** Derive a visual due-status from the task's end date and completion state. */
export function computeDueStatus(task: Task): DueStatusKey {
  if (task.status === 'Complete') return 'completed'
  if (!task.endDate) return 'none'

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(task.endDate)
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  const diffDays = Math.round((endDay.getTime() - today.getTime()) / 86_400_000)

  if (diffDays < -7) return 'critical'
  if (diffDays < 0)  return 'overdue'
  if (diffDays === 0) return 'due-today'
  if (diffDays <= 14) return 'due-soon'
  return 'upcoming'
}

export const DUE_STATUS_LABEL: Record<DueStatusKey, string> = {
  'none':      'Open-ended',
  'upcoming':  'Long Due',
  'due-soon':  'Due Soon',
  'due-today': 'Due Today',
  'overdue':   'Overdue',
  'critical':  'Long Overdue',
  'completed': 'Completed',
}

/** Compute due status for an arbitrary date string (not the full task). */
export function computeDueStatusForDate(dateStr: string, status: import('../services/tasks').TaskStatus): DueStatusKey {
  if (status === 'Complete') return 'completed'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const d = new Date(dateStr)
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((day.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < -7) return 'critical'
  if (diffDays < 0)  return 'overdue'
  if (diffDays === 0) return 'due-today'
  if (diffDays <= 14) return 'due-soon'
  return 'upcoming'
}

/** CSS custom property name for the status colour. */
export const DUE_STATUS_COLOR_VAR: Record<DueStatusKey, string> = {
  'none':      'var(--color-status-none)',
  'upcoming':  'var(--color-status-upcoming)',
  'due-soon':  'var(--color-status-due-soon)',
  'due-today': 'var(--color-status-due-today)',
  'overdue':   'var(--color-status-overdue)',
  'critical':  'var(--color-status-critical)',
  'completed': 'var(--color-status-completed)',
}
