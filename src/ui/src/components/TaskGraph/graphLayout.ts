import type { Task } from '../../services/tasks'

export const CARD_WIDTH = 180
export const CARD_HEIGHT = 80
export const ROW_HEIGHT = 120
export const CANVAS_PAD_X = 280
export const CANVAS_PAD_Y = 56   // space for floating time axis
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

function topologicalSort(tasks: Task[]): Task[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const visited = new Set<string>()
  const result: Task[] = []

  function visit(id: string) {
    if (visited.has(id)) return
    visited.add(id)
    const task = taskMap.get(id)
    if (!task) return
    for (const predId of task.predecessorIds) visit(predId)
    result.push(task)
  }

  tasks.forEach(t => visit(t.id))
  return result
}

export interface TaskPosition {
  x: number
  y: number
}

export function computeAutoLayout(
  tasks: Task[],
  viewStart: Date,
  pixelsPerDay: number,
): Map<string, TaskPosition> {
  const datedTasks = tasks.filter(t => t.endDate)
  const sorted = topologicalSort(datedTasks)
  const positions = new Map<string, TaskPosition>()
  const rowMaxX: number[] = []

  for (const task of sorted) {
    const endX = dateToX(task.endDate!, viewStart, pixelsPerDay)
    const cardLeft = endX - CARD_WIDTH

    let row = 0
    while (row < rowMaxX.length && rowMaxX[row] > cardLeft - 16) row++
    rowMaxX[row] = endX

    positions.set(task.id, {
      x: cardLeft,
      y: CANVAS_PAD_Y + row * ROW_HEIGHT,
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
