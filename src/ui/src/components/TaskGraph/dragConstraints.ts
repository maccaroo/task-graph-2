/**
 * dragConstraints.ts — single source of truth for all drag-constraint logic.
 *
 * Exports:
 *   computeMovementCorridor  — valid pixel bounds for a drag operation
 *   clampMoveDelta           — clamp a move-drag delta to the corridor
 *   clampResizePx            — clamp a resize-drag pixel to the corridor
 *   naturalAnchorPx          — implied visual pixel for a free (null) anchor
 *   computeCascadeUpdates    — map of free-anchor cascades caused by a drag
 */

import type { Task, RelationshipType } from '../../services/tasks'
import { CARD_WIDTH, dateToX, dateToY } from './graphLayout'

export type DragOperation = 'move' | 'resize-start' | 'resize-end'

export interface MovementCorridor {
  /** Minimum pixel value for the dragged anchor (−∞ = unbounded). */
  lowerPx: number
  /** Maximum pixel value for the dragged anchor (+∞ = unbounded). */
  upperPx: number
}

/** Pixel positions to cascade-write to a related task's free anchors. */
export interface CascadeUpdate {
  /** New visual pixel for the start anchor (only present when start is the free anchor). */
  startPx?: number
  /** New visual pixel for the end anchor (only present when end is the free anchor). */
  endPx?: number
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function datePx(dateStr: string, viewStart: Date, pixelsPerDay: number, vertical: boolean): number {
  const d = new Date(dateStr)
  return vertical ? dateToY(d, viewStart, pixelsPerDay) : dateToX(d, viewStart, pixelsPerDay)
}

// ── computeMovementCorridor ───────────────────────────────────────────────────

/**
 * Computes the valid movement corridor for a drag operation on a task.
 *
 * Only **fixed** (set) anchor dates on related tasks contribute bounds.
 * Free (null) anchors are skipped here — they are handled by computeCascadeUpdates.
 *
 * Constraint rules by relationship type (pred.X ≤ succ.Y):
 *   Exclusive:     pred.end  ≤ succ.start
 *   HaveStarted:   pred.start ≤ succ.start
 *   HaveCompleted: pred.end  ≤ succ.end
 *   HandOff:       pred.start ≤ succ.end
 */
export function computeMovementCorridor(
  task: Task,
  taskMap: Map<string, Task>,
  operation: DragOperation,
  pixelsPerDay: number,
  viewStart: Date,
  vertical: boolean,
): MovementCorridor {
  let lower = -Infinity
  let upper = +Infinity

  const px = (dateStr: string) => datePx(dateStr, viewStart, pixelsPerDay, vertical)

  // Duration in pixels (only meaningful for 'move' of a both-constrained task)
  const durPx: number = (() => {
    if (operation !== 'move') return 0
    if (task.startDate && task.endDate) return px(task.endDate) - px(task.startDate)
    // End-only move: the card's visual width acts as duration offset
    return CARD_WIDTH
  })()

  // Whether this is a move where endDate is the anchor (task has no startDate)
  const endAnchored = operation === 'move' && !task.startDate && Boolean(task.endDate)

  // ── T is the SUCCESSOR in each predecessor relationship ───────────────────

  for (const rel of task.predecessors) {
    const pred = taskMap.get(rel.relatedTaskId)
    if (!pred) continue

    const type = rel.type as RelationshipType

    switch (type) {
      case 'Exclusive':
        // pred.end ≤ T.start  (fixed pred.end only)
        if (pred.endDate) {
          if (operation === 'move' && !endAnchored) lower = Math.max(lower, px(pred.endDate))
          if (operation === 'resize-start') lower = Math.max(lower, px(pred.endDate))
        }
        break

      case 'HaveStarted':
        // pred.start ≤ T.start  (fixed pred.start only)
        if (pred.startDate) {
          if (operation === 'move' && !endAnchored) lower = Math.max(lower, px(pred.startDate))
          if (operation === 'resize-start') lower = Math.max(lower, px(pred.startDate))
        }
        break

      case 'HaveCompleted':
        // pred.end ≤ T.end  (fixed pred.end only)
        if (pred.endDate) {
          if (operation === 'move') {
            lower = Math.max(lower, endAnchored ? px(pred.endDate) : px(pred.endDate) - durPx)
          }
          if (operation === 'resize-end') lower = Math.max(lower, px(pred.endDate))
        }
        break

      case 'HandOff':
        // pred.start ≤ T.end  (fixed pred.start only)
        if (pred.startDate) {
          if (operation === 'move') {
            lower = Math.max(lower, endAnchored ? px(pred.startDate) : px(pred.startDate) - durPx)
          }
          if (operation === 'resize-end') lower = Math.max(lower, px(pred.startDate))
        }
        break
    }
  }

  // ── T is the PREDECESSOR in each successor relationship ───────────────────

  for (const rel of task.successors) {
    const succ = taskMap.get(rel.relatedTaskId)
    if (!succ) continue

    const type = rel.type as RelationshipType

    switch (type) {
      case 'Exclusive':
        // T.end ≤ succ.start  (fixed succ.start only)
        if (succ.startDate) {
          if (operation === 'move') {
            upper = Math.min(upper, endAnchored ? px(succ.startDate) : px(succ.startDate) - durPx)
          }
          if (operation === 'resize-end') upper = Math.min(upper, px(succ.startDate))
        }
        break

      case 'HaveStarted':
        // T.start ≤ succ.start  (fixed succ.start only)
        if (succ.startDate) {
          if (operation === 'move' && !endAnchored) upper = Math.min(upper, px(succ.startDate))
          if (operation === 'resize-start') upper = Math.min(upper, px(succ.startDate))
        }
        break

      case 'HaveCompleted':
        // T.end ≤ succ.end  (fixed succ.end only)
        if (succ.endDate) {
          if (operation === 'move') {
            upper = Math.min(upper, endAnchored ? px(succ.endDate) : px(succ.endDate) - durPx)
          }
          if (operation === 'resize-end') upper = Math.min(upper, px(succ.endDate))
        }
        break

      case 'HandOff':
        // T.start ≤ succ.end  (fixed succ.end only)
        if (succ.endDate) {
          if (operation === 'move' && !endAnchored) upper = Math.min(upper, px(succ.endDate))
          if (operation === 'resize-start') upper = Math.min(upper, px(succ.endDate))
        }
        break
    }
  }

  // ── Self-consistency: start must remain ≤ end ────────────────────────────

  if (operation === 'resize-start' && task.endDate) {
    upper = Math.min(upper, px(task.endDate))
  }
  if (operation === 'resize-end' && task.startDate) {
    lower = Math.max(lower, px(task.startDate))
  }

  return { lowerPx: lower, upperPx: upper }
}

// ── clampMoveDelta ────────────────────────────────────────────────────────────

/**
 * Clamps a proposed move delta to the valid corridor.
 *
 * @param corridor      Computed corridor for the task's anchor.
 * @param originalPosPx The card's visual leading-edge pixel (left in H-mode, top in V-mode).
 * @param endAnchored   True when the task has no startDate — the anchor is the endDate,
 *                      which sits at originalPosPx + CARD_WIDTH, not at originalPosPx.
 * @param rawDeltaPx    Proposed (snapped) delta in canvas pixels.
 * @returns Clamped delta that keeps the anchor inside [corridor.lowerPx, corridor.upperPx].
 */
export function clampMoveDelta(
  corridor: MovementCorridor,
  originalPosPx: number,
  endAnchored: boolean,
  rawDeltaPx: number,
): number {
  // For end-anchored tasks the date anchor is CARD_WIDTH to the right of the card's left edge.
  const anchorPx = endAnchored ? originalPosPx + CARD_WIDTH : originalPosPx
  return Math.max(
    corridor.lowerPx - anchorPx,
    Math.min(corridor.upperPx - anchorPx, rawDeltaPx),
  )
}

// ── clampResizePx ─────────────────────────────────────────────────────────────

/**
 * Clamps a proposed resize pixel position to the valid corridor.
 *
 * @param corridor  Computed corridor for the dragged edge.
 * @param rawPx     Proposed (snapped) absolute canvas pixel for the dragged anchor.
 * @returns Clamped pixel that stays inside [corridor.lowerPx, corridor.upperPx].
 */
export function clampResizePx(corridor: MovementCorridor, rawPx: number): number {
  return Math.max(corridor.lowerPx, Math.min(corridor.upperPx, rawPx))
}

// ── naturalAnchorPx ───────────────────────────────────────────────────────────

/**
 * Returns the implied visual pixel position of a **free** (null) anchor on a task,
 * based on the task's card rendering:
 *   - Free start (no startDate): implied start = endDate pixel − CARD_WIDTH
 *   - Free end   (no endDate):   implied end   = startDate pixel + CARD_WIDTH
 *
 * Returns null if the anchor is not free (the date is set) or if the natural
 * position cannot be determined (the opposing date is also unset).
 */
export function naturalAnchorPx(
  task: Task,
  anchor: 'start' | 'end',
  pixelsPerDay: number,
  viewStart: Date,
  vertical: boolean,
): number | null {
  const px = (dateStr: string) => datePx(dateStr, viewStart, pixelsPerDay, vertical)

  if (anchor === 'start') {
    if (task.startDate) return null          // fixed — not free
    return task.endDate ? px(task.endDate) - CARD_WIDTH : null
  }
  if (task.endDate) return null              // fixed — not free
  return task.startDate ? px(task.startDate) + CARD_WIDTH : null
}

// ── computeCascadeUpdates ─────────────────────────────────────────────────────

/**
 * Given a task being dragged to a new position, returns a map of
 * { taskId → CascadeUpdate } for every related task whose **free** anchor
 * must visually follow to maintain the relationship constraint.
 *
 * The cascade propagates transitively: if a cascaded task itself has
 * relationships with further free anchors, those are included too.
 *
 * @param task         The task being dragged (unmodified — original dates).
 * @param newStartPx   New canvas pixel for task.startDate (null if no startDate).
 * @param newEndPx     New canvas pixel for task.endDate   (null if no endDate).
 * @param taskMap      Map of all tasks by id.
 * @param pixelsPerDay Current zoom level.
 * @param viewStart    Canvas origin date.
 * @param vertical     True when the time axis is vertical.
 */
export function computeCascadeUpdates(
  task: Task,
  newStartPx: number | null,
  newEndPx: number | null,
  taskMap: Map<string, Task>,
  pixelsPerDay: number,
  viewStart: Date,
  vertical: boolean,
): Map<string, CascadeUpdate> {
  const updates = new Map<string, CascadeUpdate>()
  const px = (dateStr: string) => datePx(dateStr, viewStart, pixelsPerDay, vertical)

  function applyUpdate(taskId: string, patch: CascadeUpdate) {
    const prev = updates.get(taskId) ?? {}
    updates.set(taskId, { ...prev, ...patch })
  }

  /**
   * Compute effective start/end pixels for a task given its current or cascaded data.
   * If the date is set, use the actual pixel. If null (free), use CARD_WIDTH offset from
   * the opposing anchor. Falls back to null if neither anchor is available.
   */
  function effectivePx(
    t: Task,
    cascaded: CascadeUpdate,
  ): { startPx: number | null; endPx: number | null } {
    const rawStart = cascaded.startPx ?? (t.startDate ? px(t.startDate) : null)
    const rawEnd   = cascaded.endPx   ?? (t.endDate   ? px(t.endDate)   : null)
    const startPx  = rawStart ?? (rawEnd   !== null ? rawEnd   - CARD_WIDTH : null)
    const endPx    = rawEnd   ?? (rawStart !== null ? rawStart + CARD_WIDTH : null)
    return { startPx, endPx }
  }

  // BFS from the dragged task outward through free-anchor relationships.
  // Each entry: [taskId, effectiveStartPx, effectiveEndPx]
  const queue: Array<[string, number | null, number | null]> = []
  const visited = new Set<string>([task.id])

  // Seed with effective positions of the dragged task
  const draggedStart = newStartPx ?? (newEndPx !== null ? newEndPx - CARD_WIDTH : null)
  const draggedEnd   = newEndPx   ?? (newStartPx !== null ? newStartPx + CARD_WIDTH : null)
  queue.push([task.id, draggedStart, draggedEnd])

  while (queue.length > 0) {
    const [currentId, currentStartPx, currentEndPx] = queue.shift()!
    const currentTask = currentId === task.id ? task : taskMap.get(currentId)
    if (!currentTask) continue

    // ── currentTask is the PREDECESSOR → check its successors ────────────────

    for (const rel of currentTask.successors) {
      const succ = taskMap.get(rel.relatedTaskId)
      if (!succ) continue

      const type = rel.type as RelationshipType
      let patch: CascadeUpdate | null = null

      switch (type) {
        case 'Exclusive':
          // currentTask.end ≤ succ.start; cascade if succ.start is free and current end is past it
          if (!succ.startDate && succ.endDate && currentEndPx !== null) {
            const naturalStart = px(succ.endDate) - CARD_WIDTH
            if (currentEndPx > naturalStart) patch = { startPx: currentEndPx }
          }
          break

        case 'HaveStarted':
          // currentTask.start ≤ succ.start; cascade if succ.start is free and current start is past it
          if (!succ.startDate && succ.endDate && currentStartPx !== null) {
            const naturalStart = px(succ.endDate) - CARD_WIDTH
            if (currentStartPx > naturalStart) patch = { startPx: currentStartPx }
          }
          break

        case 'HaveCompleted':
          // currentTask.end ≤ succ.end; cascade if succ.end is free and current end is past it
          if (!succ.endDate && succ.startDate && currentEndPx !== null) {
            const naturalEnd = px(succ.startDate) + CARD_WIDTH
            if (currentEndPx > naturalEnd) patch = { endPx: currentEndPx }
          }
          break

        case 'HandOff':
          // currentTask.start ≤ succ.end; cascade if succ.end is free and current start is past it
          if (!succ.endDate && succ.startDate && currentStartPx !== null) {
            const naturalEnd = px(succ.startDate) + CARD_WIDTH
            if (currentStartPx > naturalEnd) patch = { endPx: currentStartPx }
          }
          break
      }

      if (patch) {
        applyUpdate(succ.id, patch)
        if (!visited.has(succ.id)) {
          visited.add(succ.id)
          const merged = updates.get(succ.id)!
          const { startPx: s, endPx: e } = effectivePx(succ, merged)
          queue.push([succ.id, s, e])
        }
      }
    }

    // ── currentTask is the SUCCESSOR → check its predecessors ────────────────

    for (const rel of currentTask.predecessors) {
      const pred = taskMap.get(rel.relatedTaskId)
      if (!pred) continue

      const type = rel.type as RelationshipType
      let patch: CascadeUpdate | null = null

      switch (type) {
        case 'Exclusive':
          // pred.end ≤ currentTask.start; cascade if pred.end is free and current start is before it
          if (!pred.endDate && pred.startDate && currentStartPx !== null) {
            const naturalEnd = px(pred.startDate) + CARD_WIDTH
            if (currentStartPx < naturalEnd) patch = { endPx: currentStartPx }
          }
          break

        case 'HaveStarted':
          // pred.start ≤ currentTask.start; cascade if pred.start is free and current start is before it
          if (!pred.startDate && pred.endDate && currentStartPx !== null) {
            const naturalStart = px(pred.endDate) - CARD_WIDTH
            if (currentStartPx < naturalStart) patch = { startPx: currentStartPx }
          }
          break

        case 'HaveCompleted':
          // pred.end ≤ currentTask.end; cascade if pred.end is free and current end is before it
          if (!pred.endDate && pred.startDate && currentEndPx !== null) {
            const naturalEnd = px(pred.startDate) + CARD_WIDTH
            if (currentEndPx < naturalEnd) patch = { endPx: currentEndPx }
          }
          break

        case 'HandOff':
          // pred.start ≤ currentTask.end; cascade if pred.start is free and current end is before it
          if (!pred.startDate && pred.endDate && currentEndPx !== null) {
            const naturalStart = px(pred.endDate) - CARD_WIDTH
            if (currentEndPx < naturalStart) patch = { startPx: currentEndPx }
          }
          break
      }

      if (patch) {
        applyUpdate(pred.id, patch)
        if (!visited.has(pred.id)) {
          visited.add(pred.id)
          const merged = updates.get(pred.id)!
          const { startPx: s, endPx: e } = effectivePx(pred, merged)
          queue.push([pred.id, s, e])
        }
      }
    }
  }

  return updates
}
