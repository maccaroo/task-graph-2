/**
 * Enforcement tests — verify that the corridor clamping prevents any move drag from
 * producing a date that violates a relationship constraint.
 *
 * Each test:
 *   1. Sets up tasks with a specific relationship type and direction.
 *   2. Proposes a large delta that would clearly violate the constraint.
 *   3. Applies computeMovementCorridor + clampMoveDelta.
 *   4. Converts the clamped delta back to new dates and asserts the constraint holds.
 */
import { describe, it, expect } from 'vitest'
import { computeMovementCorridor, clampMoveDelta } from './dragConstraints'
import { dateToX, CARD_WIDTH } from './graphLayout'
import type { Task, TaskRelationshipInfo } from '../../services/tasks'

const PPD = 40 // pixels per day
const VIEW_START = new Date('2025-01-01T00:00:00.000Z')
const VERTICAL = false
const MS_PER_DAY = 86_400_000

function px(dateStr: string): number {
  return dateToX(new Date(dateStr), VIEW_START, PPD)
}

function makeTask(
  id: string,
  startDate: string | null,
  endDate: string | null,
  predecessors: TaskRelationshipInfo[] = [],
  successors: TaskRelationshipInfo[] = [],
): Task {
  return {
    id, title: id, description: null, assigneeId: null, assigneeUsername: null,
    status: 'Incomplete', priority: 'Medium', tags: [], startType: 'Fixed', startDate,
    endType: 'Fixed', endDate, duration: null,
    predecessorIds: predecessors.map(p => p.relatedTaskId),
    successorIds: successors.map(s => s.relatedTaskId),
    predecessors, successors,
  }
}

function rel(relatedTaskId: string, type: TaskRelationshipInfo['type']): TaskRelationshipInfo {
  return { relatedTaskId, type }
}

/**
 * Simulates the full move-drag enforcement pipeline:
 *  1. Compute corridor.
 *  2. Clamp the proposed delta.
 *  3. Return { clampedDelta, newStartDate, newEndDate }.
 */
function simulateMove(task: Task, taskMap: Map<string, Task>, rawDeltaPx: number) {
  const endAnchored = !task.startDate && Boolean(task.endDate)
  const anchorDateStr = task.startDate ?? task.endDate!
  // Leading-edge pixel of the card (mirrors graphLayout.computeAutoLayout)
  const originalPosPx = endAnchored
    ? px(task.endDate!) - CARD_WIDTH
    : px(anchorDateStr)

  const corridor = computeMovementCorridor(task, taskMap, 'move', PPD, VIEW_START, VERTICAL)
  const clampedDelta = clampMoveDelta(corridor, originalPosPx, endAnchored, rawDeltaPx)

  const deltaMs = (clampedDelta / PPD) * MS_PER_DAY
  const newStartDate = task.startDate ? new Date(new Date(task.startDate).getTime() + deltaMs) : null
  const newEndDate   = task.endDate   ? new Date(new Date(task.endDate).getTime()   + deltaMs) : null

  return { clampedDelta, newStartDate, newEndDate }
}

// ── Exclusive: pred.end ≤ succ.start ──────────────────────────────────────────

describe('Exclusive — enforcement', () => {

  describe('task is successor (lower bound: task.start ≥ pred.end)', () => {
    const pred = makeTask('P', '2025-06-05', '2025-06-10')

    it('both-constrained: dragging far left is clamped so start ≥ pred.end', () => {
      const task = makeTask('T', '2025-06-15', '2025-06-20', [rel('P', 'Exclusive')])
      const { newStartDate } = simulateMove(task, new Map([['P', pred], ['T', task]]), -100 * PPD)
      expect(newStartDate!.getTime()).toBeGreaterThanOrEqual(new Date('2025-06-10').getTime())
    })

    it('start-only: dragging far left is clamped so start ≥ pred.end', () => {
      const task = makeTask('T', '2025-06-15', null, [rel('P', 'Exclusive')])
      const { newStartDate } = simulateMove(task, new Map([['P', pred], ['T', task]]), -100 * PPD)
      expect(newStartDate!.getTime()).toBeGreaterThanOrEqual(new Date('2025-06-10').getTime())
    })
  })

  describe('task is predecessor (upper bound: task.end ≤ succ.start)', () => {
    const succ = makeTask('S', '2025-06-25', '2025-06-30')

    it('both-constrained: dragging far right is clamped so end ≤ succ.start', () => {
      const task = makeTask('T', '2025-06-15', '2025-06-20', [], [rel('S', 'Exclusive')])
      const { newEndDate } = simulateMove(task, new Map([['S', succ], ['T', task]]), 100 * PPD)
      expect(newEndDate!.getTime()).toBeLessThanOrEqual(new Date('2025-06-25').getTime())
    })

    it('end-only: dragging far right is clamped so end ≤ succ.start', () => {
      const task = makeTask('T', null, '2025-06-20', [], [rel('S', 'Exclusive')])
      const { newEndDate } = simulateMove(task, new Map([['S', succ], ['T', task]]), 100 * PPD)
      expect(newEndDate!.getTime()).toBeLessThanOrEqual(new Date('2025-06-25').getTime())
    })
  })
})

// ── HaveStarted: pred.start ≤ succ.start ──────────────────────────────────────

describe('HaveStarted — enforcement', () => {

  describe('task is successor (lower bound: task.start ≥ pred.start)', () => {
    const pred = makeTask('P', '2025-06-05', '2025-06-10')

    it('both-constrained: dragging far left is clamped so start ≥ pred.start', () => {
      const task = makeTask('T', '2025-06-15', '2025-06-20', [rel('P', 'HaveStarted')])
      const { newStartDate } = simulateMove(task, new Map([['P', pred], ['T', task]]), -100 * PPD)
      expect(newStartDate!.getTime()).toBeGreaterThanOrEqual(new Date('2025-06-05').getTime())
    })

    it('start-only: dragging far left is clamped so start ≥ pred.start', () => {
      const task = makeTask('T', '2025-06-15', null, [rel('P', 'HaveStarted')])
      const { newStartDate } = simulateMove(task, new Map([['P', pred], ['T', task]]), -100 * PPD)
      expect(newStartDate!.getTime()).toBeGreaterThanOrEqual(new Date('2025-06-05').getTime())
    })
  })

  describe('task is predecessor (upper bound: task.start ≤ succ.start)', () => {
    const succ = makeTask('S', '2025-06-25', '2025-06-30')

    it('both-constrained: dragging far right is clamped so start ≤ succ.start', () => {
      const task = makeTask('T', '2025-06-15', '2025-06-20', [], [rel('S', 'HaveStarted')])
      const { newStartDate } = simulateMove(task, new Map([['S', succ], ['T', task]]), 100 * PPD)
      expect(newStartDate!.getTime()).toBeLessThanOrEqual(new Date('2025-06-25').getTime())
    })

    it('start-only: dragging far right is clamped so start ≤ succ.start', () => {
      const task = makeTask('T', '2025-06-15', null, [], [rel('S', 'HaveStarted')])
      const { newStartDate } = simulateMove(task, new Map([['S', succ], ['T', task]]), 100 * PPD)
      expect(newStartDate!.getTime()).toBeLessThanOrEqual(new Date('2025-06-25').getTime())
    })
  })
})

// ── HaveCompleted: pred.end ≤ succ.end ────────────────────────────────────────

describe('HaveCompleted — enforcement', () => {

  describe('task is successor (lower bound: task.end ≥ pred.end)', () => {
    const pred = makeTask('P', '2025-06-05', '2025-06-10')

    it('both-constrained: dragging far left is clamped so end ≥ pred.end', () => {
      const task = makeTask('T', '2025-06-15', '2025-06-20', [rel('P', 'HaveCompleted')])
      const { newEndDate } = simulateMove(task, new Map([['P', pred], ['T', task]]), -100 * PPD)
      expect(newEndDate!.getTime()).toBeGreaterThanOrEqual(new Date('2025-06-10').getTime())
    })

    it('end-only: dragging far left is clamped so end ≥ pred.end', () => {
      const task = makeTask('T', null, '2025-06-20', [rel('P', 'HaveCompleted')])
      const { newEndDate } = simulateMove(task, new Map([['P', pred], ['T', task]]), -100 * PPD)
      expect(newEndDate!.getTime()).toBeGreaterThanOrEqual(new Date('2025-06-10').getTime())
    })
  })

  describe('task is predecessor (upper bound: task.end ≤ succ.end)', () => {
    const succ = makeTask('S', '2025-06-25', '2025-06-30')

    it('both-constrained: dragging far right is clamped so end ≤ succ.end', () => {
      const task = makeTask('T', '2025-06-15', '2025-06-20', [], [rel('S', 'HaveCompleted')])
      const { newEndDate } = simulateMove(task, new Map([['S', succ], ['T', task]]), 100 * PPD)
      expect(newEndDate!.getTime()).toBeLessThanOrEqual(new Date('2025-06-30').getTime())
    })

    it('end-only: dragging far right is clamped so end ≤ succ.end', () => {
      const task = makeTask('T', null, '2025-06-20', [], [rel('S', 'HaveCompleted')])
      const { newEndDate } = simulateMove(task, new Map([['S', succ], ['T', task]]), 100 * PPD)
      expect(newEndDate!.getTime()).toBeLessThanOrEqual(new Date('2025-06-30').getTime())
    })
  })
})

// ── HandOff: pred.start ≤ succ.end ────────────────────────────────────────────

describe('HandOff — enforcement', () => {

  describe('task is successor (lower bound: task.end ≥ pred.start)', () => {
    const pred = makeTask('P', '2025-06-05', '2025-06-10')

    it('both-constrained: dragging far left is clamped so end ≥ pred.start', () => {
      const task = makeTask('T', '2025-06-15', '2025-06-20', [rel('P', 'HandOff')])
      const { newEndDate } = simulateMove(task, new Map([['P', pred], ['T', task]]), -100 * PPD)
      expect(newEndDate!.getTime()).toBeGreaterThanOrEqual(new Date('2025-06-05').getTime())
    })

    it('end-only: dragging far left is clamped so end ≥ pred.start', () => {
      const task = makeTask('T', null, '2025-06-20', [rel('P', 'HandOff')])
      const { newEndDate } = simulateMove(task, new Map([['P', pred], ['T', task]]), -100 * PPD)
      expect(newEndDate!.getTime()).toBeGreaterThanOrEqual(new Date('2025-06-05').getTime())
    })
  })

  describe('task is predecessor (upper bound: task.start ≤ succ.end)', () => {
    const succ = makeTask('S', '2025-06-25', '2025-06-30')

    it('both-constrained: dragging far right is clamped so start ≤ succ.end', () => {
      const task = makeTask('T', '2025-06-15', '2025-06-20', [], [rel('S', 'HandOff')])
      const { newStartDate } = simulateMove(task, new Map([['S', succ], ['T', task]]), 100 * PPD)
      expect(newStartDate!.getTime()).toBeLessThanOrEqual(new Date('2025-06-30').getTime())
    })

    it('start-only: dragging far right is clamped so start ≤ succ.end', () => {
      const task = makeTask('T', '2025-06-15', null, [], [rel('S', 'HandOff')])
      const { newStartDate } = simulateMove(task, new Map([['S', succ], ['T', task]]), 100 * PPD)
      expect(newStartDate!.getTime()).toBeLessThanOrEqual(new Date('2025-06-30').getTime())
    })
  })
})

// ── Multiple relationships: tightest bound wins ────────────────────────────────

describe('Multiple constraints — tightest bound always wins', () => {

  it('two Exclusive predecessors: task cannot go before the later pred.end', () => {
    const pred1 = makeTask('P1', '2025-06-01', '2025-06-08')  // lower = Jun 8
    const pred2 = makeTask('P2', '2025-06-01', '2025-06-12')  // lower = Jun 12  (tighter)
    const task  = makeTask('T', '2025-06-15', '2025-06-20',
      [rel('P1', 'Exclusive'), rel('P2', 'Exclusive')])
    const { newStartDate } = simulateMove(
      task,
      new Map([['P1', pred1], ['P2', pred2], ['T', task]]),
      -100 * PPD,
    )
    expect(newStartDate!.getTime()).toBeGreaterThanOrEqual(new Date('2025-06-12').getTime())
  })

  it('two Exclusive successors: task cannot go past the earlier succ.start', () => {
    const succ1 = makeTask('S1', '2025-06-25', '2025-07-01')  // upper = Jun 25 - dur (tighter)
    const succ2 = makeTask('S2', '2025-06-30', '2025-07-10')  // upper = Jun 30 - dur
    const task  = makeTask('T', '2025-06-15', '2025-06-20', [],
      [rel('S1', 'Exclusive'), rel('S2', 'Exclusive')])
    const { newEndDate } = simulateMove(
      task,
      new Map([['S1', succ1], ['S2', succ2], ['T', task]]),
      100 * PPD,
    )
    expect(newEndDate!.getTime()).toBeLessThanOrEqual(new Date('2025-06-25').getTime())
  })
})

// ── No relationships: unbounded ────────────────────────────────────────────────

describe('No relationships — no clamping applied', () => {

  it('allows arbitrarily large positive delta', () => {
    const task = makeTask('T', '2025-06-15', '2025-06-20')
    const { clampedDelta } = simulateMove(task, new Map([['T', task]]), 1_000_000)
    expect(clampedDelta).toBe(1_000_000)
  })

  it('allows arbitrarily large negative delta', () => {
    const task = makeTask('T', '2025-06-15', '2025-06-20')
    const { clampedDelta } = simulateMove(task, new Map([['T', task]]), -1_000_000)
    expect(clampedDelta).toBe(-1_000_000)
  })
})
