import { describe, it, expect } from 'vitest'
import { computeMovementCorridor } from './dragConstraints'
import { dateToX, CANVAS_PAD_X } from './graphLayout'
import type { Task, TaskRelationshipInfo } from '../../services/tasks'

const PPD = 40 // pixels per day
const VIEW_START = new Date('2025-01-01T00:00:00.000Z')
const VERTICAL = false

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

// ── Baseline: no relationships → unbounded ────────────────────────────────

describe('no relationships', () => {
  it('move returns -Infinity / +Infinity', () => {
    const task = makeTask('T', '2025-06-10', '2025-06-15')
    const result = computeMovementCorridor(task, new Map([['T', task]]), 'move', PPD, VIEW_START, VERTICAL)
    expect(result.lowerPx).toBe(-Infinity)
    expect(result.upperPx).toBe(+Infinity)
  })
})

// ── Exclusive: pred.end ≤ succ.start ─────────────────────────────────────

describe('Exclusive relationship', () => {
  // pred ends on Jun 10, task starts Jun 15 (5 days gap)
  const pred = makeTask('P', '2025-06-05', '2025-06-10')
  const task = makeTask('T', '2025-06-15', '2025-06-20', [rel('P', 'Exclusive')])
  const succ = makeTask('S', '2025-06-25', '2025-06-30')
  const taskAsPred = makeTask('T', '2025-06-15', '2025-06-20', [], [rel('S', 'Exclusive')])

  it('move — lower bound = pred.endPx (T is successor)', () => {
    const map = new Map([['P', pred], ['T', task]])
    const c = computeMovementCorridor(task, map, 'move', PPD, VIEW_START, VERTICAL)
    expect(c.lowerPx).toBe(px('2025-06-10'))
  })

  it('move — upper bound = succ.startPx − durPx (T is predecessor)', () => {
    const durPx = px('2025-06-20') - px('2025-06-15')
    const map = new Map([['S', succ], ['T', taskAsPred]])
    const c = computeMovementCorridor(taskAsPred, map, 'move', PPD, VIEW_START, VERTICAL)
    expect(c.upperPx).toBe(px('2025-06-25') - durPx)
  })

  it('resize-end — upper bound = succ.startPx', () => {
    const map = new Map([['S', succ], ['T', taskAsPred]])
    const c = computeMovementCorridor(taskAsPred, map, 'resize-end', PPD, VIEW_START, VERTICAL)
    expect(c.upperPx).toBe(px('2025-06-25'))
  })

  it('resize-start — lower bound = pred.endPx', () => {
    const map = new Map([['P', pred], ['T', task]])
    const c = computeMovementCorridor(task, map, 'resize-start', PPD, VIEW_START, VERTICAL)
    expect(c.lowerPx).toBe(px('2025-06-10'))
  })
})

// ── HaveStarted: pred.start ≤ succ.start ─────────────────────────────────

describe('HaveStarted relationship', () => {
  const pred = makeTask('P', '2025-06-05', '2025-06-10')
  const task = makeTask('T', '2025-06-15', '2025-06-20', [rel('P', 'HaveStarted')])
  const succ = makeTask('S', '2025-06-25', '2025-06-30')
  const taskAsPred = makeTask('T', '2025-06-15', '2025-06-20', [], [rel('S', 'HaveStarted')])

  it('move — lower bound = pred.startPx', () => {
    const map = new Map([['P', pred], ['T', task]])
    const c = computeMovementCorridor(task, map, 'move', PPD, VIEW_START, VERTICAL)
    expect(c.lowerPx).toBe(px('2025-06-05'))
  })

  it('move — upper bound = succ.startPx', () => {
    const map = new Map([['S', succ], ['T', taskAsPred]])
    const c = computeMovementCorridor(taskAsPred, map, 'move', PPD, VIEW_START, VERTICAL)
    expect(c.upperPx).toBe(px('2025-06-25'))
  })

  it('resize-start — lower bound = pred.startPx', () => {
    const map = new Map([['P', pred], ['T', task]])
    const c = computeMovementCorridor(task, map, 'resize-start', PPD, VIEW_START, VERTICAL)
    expect(c.lowerPx).toBe(px('2025-06-05'))
  })

  it('resize-start — upper bound = succ.startPx', () => {
    // succ.start = Jun 17 (before T.end = Jun 20) so HaveStarted is the binding constraint
    const nearSucc = makeTask('S', '2025-06-17', '2025-06-30')
    const map = new Map([['S', nearSucc], ['T', taskAsPred]])
    const c = computeMovementCorridor(taskAsPred, map, 'resize-start', PPD, VIEW_START, VERTICAL)
    expect(c.upperPx).toBe(px('2025-06-17'))
  })
})

// ── HaveCompleted: pred.end ≤ succ.end ───────────────────────────────────

describe('HaveCompleted relationship', () => {
  const pred = makeTask('P', '2025-06-05', '2025-06-10')
  const task = makeTask('T', '2025-06-15', '2025-06-20', [rel('P', 'HaveCompleted')])
  const succ = makeTask('S', '2025-06-25', '2025-06-30')
  const taskAsPred = makeTask('T', '2025-06-15', '2025-06-20', [], [rel('S', 'HaveCompleted')])

  it('move — lower bound = pred.endPx − durPx', () => {
    const durPx = px('2025-06-20') - px('2025-06-15')
    const map = new Map([['P', pred], ['T', task]])
    const c = computeMovementCorridor(task, map, 'move', PPD, VIEW_START, VERTICAL)
    expect(c.lowerPx).toBe(px('2025-06-10') - durPx)
  })

  it('move — upper bound = succ.endPx − durPx', () => {
    const durPx = px('2025-06-20') - px('2025-06-15')
    const map = new Map([['S', succ], ['T', taskAsPred]])
    const c = computeMovementCorridor(taskAsPred, map, 'move', PPD, VIEW_START, VERTICAL)
    expect(c.upperPx).toBe(px('2025-06-30') - durPx)
  })

  it('resize-end — lower = pred.endPx, upper = succ.endPx', () => {
    // pred.end = Jun 17 (between T.start and T.end) so HaveCompleted lower is binding
    // succ.end = Jun 30 (after T.end) so HaveCompleted upper is binding
    const nearPred = makeTask('P', '2025-06-05', '2025-06-17')
    const taskBoth = makeTask('T', '2025-06-15', '2025-06-20', [rel('P', 'HaveCompleted')], [rel('S', 'HaveCompleted')])
    const c = computeMovementCorridor(taskBoth, new Map([['P', nearPred], ['S', succ], ['T', taskBoth]]), 'resize-end', PPD, VIEW_START, VERTICAL)
    expect(c.lowerPx).toBe(px('2025-06-17'))
    expect(c.upperPx).toBe(px('2025-06-30'))
  })
})

// ── HandOff: pred.start ≤ succ.end ───────────────────────────────────────

describe('HandOff relationship', () => {
  const pred = makeTask('P', '2025-06-05', '2025-06-10')
  const task = makeTask('T', '2025-06-15', '2025-06-20', [rel('P', 'HandOff')])
  const succ = makeTask('S', '2025-06-25', '2025-06-30')
  const taskAsPred = makeTask('T', '2025-06-15', '2025-06-20', [], [rel('S', 'HandOff')])

  it('move — lower = pred.startPx − durPx', () => {
    const durPx = px('2025-06-20') - px('2025-06-15')
    const map = new Map([['P', pred], ['T', task]])
    const c = computeMovementCorridor(task, map, 'move', PPD, VIEW_START, VERTICAL)
    expect(c.lowerPx).toBe(px('2025-06-05') - durPx)
  })

  it('move — upper = succ.endPx', () => {
    const map = new Map([['S', succ], ['T', taskAsPred]])
    const c = computeMovementCorridor(taskAsPred, map, 'move', PPD, VIEW_START, VERTICAL)
    expect(c.upperPx).toBe(px('2025-06-30'))
  })

  it('resize-end — lower = pred.startPx', () => {
    // pred.start = Jun 17 (between T.start and T.end) so HandOff lower is binding over self-consistency
    const nearPred = makeTask('P', '2025-06-17', '2025-06-22')
    const map = new Map([['P', nearPred], ['T', task]])
    const c = computeMovementCorridor(task, map, 'resize-end', PPD, VIEW_START, VERTICAL)
    expect(c.lowerPx).toBe(px('2025-06-17'))
  })

  it('resize-start — upper = succ.endPx', () => {
    // succ.end = Jun 17 (between T.start and T.end) so HandOff upper is binding over self-consistency
    const nearSucc = makeTask('S', '2025-06-10', '2025-06-17')
    const map = new Map([['S', nearSucc], ['T', taskAsPred]])
    const c = computeMovementCorridor(taskAsPred, map, 'resize-start', PPD, VIEW_START, VERTICAL)
    expect(c.upperPx).toBe(px('2025-06-17'))
  })
})

// ── Self-consistency bounds ───────────────────────────────────────────────

describe('self-consistency', () => {
  it('resize-start upper bound = endDatePx when no other constraints', () => {
    const task = makeTask('T', '2025-06-10', '2025-06-20')
    const c = computeMovementCorridor(task, new Map([['T', task]]), 'resize-start', PPD, VIEW_START, VERTICAL)
    expect(c.upperPx).toBe(px('2025-06-20'))
  })

  it('resize-end lower bound = startDatePx when no other constraints', () => {
    const task = makeTask('T', '2025-06-10', '2025-06-20')
    const c = computeMovementCorridor(task, new Map([['T', task]]), 'resize-end', PPD, VIEW_START, VERTICAL)
    expect(c.lowerPx).toBe(px('2025-06-10'))
  })
})

// ── End-anchored move (no startDate) ─────────────────────────────────────

describe('end-anchored move (task has only endDate)', () => {
  it('HaveCompleted pred: lower = pred.endPx', () => {
    const pred = makeTask('P', '2025-06-05', '2025-06-10')
    const task = makeTask('T', null, '2025-06-20', [rel('P', 'HaveCompleted')])
    const map = new Map([['P', pred], ['T', task]])
    const c = computeMovementCorridor(task, map, 'move', PPD, VIEW_START, VERTICAL)
    expect(c.lowerPx).toBe(px('2025-06-10'))
  })

  it('Exclusive succ: upper = succ.startPx', () => {
    const succ = makeTask('S', '2025-06-25', null)
    const task = makeTask('T', null, '2025-06-20', [], [rel('S', 'Exclusive')])
    const map = new Map([['S', succ], ['T', task]])
    const c = computeMovementCorridor(task, map, 'move', PPD, VIEW_START, VERTICAL)
    expect(c.upperPx).toBe(px('2025-06-25'))
  })
})

// ── Multiple relationships: tightest bound wins ───────────────────────────

describe('multiple relationships — tightest bound wins', () => {
  it('two predecessors: lower = max of their bounds', () => {
    const pred1 = makeTask('P1', '2025-06-05', '2025-06-08') // Exclusive: lower = Jun 8
    const pred2 = makeTask('P2', '2025-06-01', '2025-06-12') // Exclusive: lower = Jun 12
    const task = makeTask('T', '2025-06-15', '2025-06-20',
      [rel('P1', 'Exclusive'), rel('P2', 'Exclusive')])
    const map = new Map([['P1', pred1], ['P2', pred2], ['T', task]])
    const c = computeMovementCorridor(task, map, 'move', PPD, VIEW_START, VERTICAL)
    expect(c.lowerPx).toBe(px('2025-06-12'))
  })
})

// ── Canvas origin check ───────────────────────────────────────────────────

describe('canvas origin', () => {
  it('dateToX returns CANVAS_PAD_X at viewStart', () => {
    expect(px('2025-01-01')).toBe(CANVAS_PAD_X)
  })
})
