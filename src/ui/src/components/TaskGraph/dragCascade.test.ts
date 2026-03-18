/**
 * Tests for naturalAnchorPx and computeCascadeUpdates.
 *
 * Cascade rule: when the dragged task's relevant anchor passes the **natural**
 * position of a related task's free anchor, the free anchor follows.
 *
 * Natural positions:
 *   free start (no startDate): endDate pixel − CARD_WIDTH
 *   free end   (no endDate):   startDate pixel + CARD_WIDTH
 */
import { describe, it, expect } from 'vitest'
import { naturalAnchorPx, computeCascadeUpdates } from './dragConstraints'
import { dateToX, CARD_WIDTH, CANVAS_PAD_X } from './graphLayout'
import type { Task, TaskRelationshipInfo } from '../../services/tasks'

const PPD = 40
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

// ── naturalAnchorPx ───────────────────────────────────────────────────────────

describe('naturalAnchorPx', () => {
  it('free start (end-only task): returns endPx − CARD_WIDTH', () => {
    const task = makeTask('T', null, '2025-06-10')
    const result = naturalAnchorPx(task, 'start', PPD, VIEW_START, VERTICAL)
    expect(result).toBe(px('2025-06-10') - CARD_WIDTH)
  })

  it('free end (start-only task): returns startPx + CARD_WIDTH', () => {
    const task = makeTask('T', '2025-06-10', null)
    const result = naturalAnchorPx(task, 'end', PPD, VIEW_START, VERTICAL)
    expect(result).toBe(px('2025-06-10') + CARD_WIDTH)
  })

  it('fixed start: returns null', () => {
    const task = makeTask('T', '2025-06-10', '2025-06-20')
    expect(naturalAnchorPx(task, 'start', PPD, VIEW_START, VERTICAL)).toBeNull()
  })

  it('fixed end: returns null', () => {
    const task = makeTask('T', '2025-06-10', '2025-06-20')
    expect(naturalAnchorPx(task, 'end', PPD, VIEW_START, VERTICAL)).toBeNull()
  })

  it('both null: start returns null (no opposing date)', () => {
    const task = makeTask('T', null, null)
    expect(naturalAnchorPx(task, 'start', PPD, VIEW_START, VERTICAL)).toBeNull()
  })

  it('both null: end returns null (no opposing date)', () => {
    const task = makeTask('T', null, null)
    expect(naturalAnchorPx(task, 'end', PPD, VIEW_START, VERTICAL)).toBeNull()
  })

  it('canvas origin: VIEW_START maps to CANVAS_PAD_X', () => {
    expect(px('2025-01-01')).toBe(CANVAS_PAD_X)
  })
})

// ── computeCascadeUpdates — HandOff ──────────────────────────────────────────
// Constraint: pred.start ≤ succ.end

describe('HandOff — cascade', () => {
  describe('succ (T) is dragged; pred has free start', () => {
    // pred is end-only (no startDate); natural start = pred.endDate − CARD_WIDTH
    // T is succ; dragging T.end left
    const pred = makeTask('P', null, '2025-06-20')
    const predNaturalStart = px('2025-06-20') - CARD_WIDTH

    it('before critical point: no cascade', () => {
      const t = makeTask('T', '2025-06-25', '2025-06-30', [rel('P', 'HandOff')])
      const map = new Map([['P', pred], ['T', t]])
      // Move T right — T.end moves away from pred.start
      const updates = computeCascadeUpdates(t, px('2025-06-30'), px('2025-07-05'), map, PPD, VIEW_START, VERTICAL)
      expect(updates.has('P')).toBe(false)
    })

    it('at critical point (exactly): no cascade (boundary inclusive on the non-cascade side)', () => {
      const t = makeTask('T', null, '2025-06-25', [rel('P', 'HandOff')])
      const map = new Map([['P', pred], ['T', t]])
      // Move T so T.end = predNaturalStart (boundary)
      const updates = computeCascadeUpdates(t, null, predNaturalStart, map, PPD, VIEW_START, VERTICAL)
      expect(updates.has('P')).toBe(false)
    })

    it('past critical point: pred.startPx follows T.end', () => {
      const t = makeTask('T', null, '2025-06-25', [rel('P', 'HandOff')])
      const map = new Map([['P', pred], ['T', t]])
      const newEndPx = predNaturalStart - PPD * 3  // 3 days before critical
      const updates = computeCascadeUpdates(t, null, newEndPx, map, PPD, VIEW_START, VERTICAL)
      expect(updates.get('P')?.startPx).toBe(newEndPx)
    })

    it('returns toward natural: no cascade when T.end is back before critical point', () => {
      const t = makeTask('T', null, '2025-06-25', [rel('P', 'HandOff')])
      const map = new Map([['P', pred], ['T', t]])
      const newEndPx = predNaturalStart + PPD  // 1 day after critical — back inside
      const updates = computeCascadeUpdates(t, null, newEndPx, map, PPD, VIEW_START, VERTICAL)
      expect(updates.has('P')).toBe(false)
    })
  })

  describe('pred (T) is dragged; succ has free end', () => {
    // succ is start-only (no endDate); natural end = succ.startDate + CARD_WIDTH
    // T is pred; dragging T.start right
    const succ = makeTask('S', '2025-06-10', null)
    const succNaturalEnd = px('2025-06-10') + CARD_WIDTH

    it('before critical point: no cascade', () => {
      const t = makeTask('T', '2025-06-01', '2025-06-05', [], [rel('S', 'HandOff')])
      const map = new Map([['S', succ], ['T', t]])
      const updates = computeCascadeUpdates(t, px('2025-06-01'), px('2025-06-05'), map, PPD, VIEW_START, VERTICAL)
      expect(updates.has('S')).toBe(false)
    })

    it('past critical point: succ.endPx follows T.start', () => {
      const t = makeTask('T', '2025-06-01', '2025-06-05', [], [rel('S', 'HandOff')])
      const map = new Map([['S', succ], ['T', t]])
      const newStartPx = succNaturalEnd + PPD * 2  // 2 days past critical
      const updates = computeCascadeUpdates(t, newStartPx, newStartPx + PPD * 4, map, PPD, VIEW_START, VERTICAL)
      expect(updates.get('S')?.endPx).toBe(newStartPx)
    })
  })
})

// ── computeCascadeUpdates — Exclusive ────────────────────────────────────────
// Constraint: pred.end ≤ succ.start

describe('Exclusive — cascade', () => {
  describe('succ (T) is dragged; pred has free end', () => {
    // pred is start-only; natural end = startDate + CARD_WIDTH
    const pred = makeTask('P', '2025-06-10', null)
    const predNaturalEnd = px('2025-06-10') + CARD_WIDTH

    it('past critical point: pred.endPx follows T.start', () => {
      const t = makeTask('T', '2025-06-25', '2025-06-30', [rel('P', 'Exclusive')])
      const map = new Map([['P', pred], ['T', t]])
      const newStartPx = predNaturalEnd - PPD * 3  // succ.start before pred's natural end
      const updates = computeCascadeUpdates(t, newStartPx, newStartPx + PPD * 5, map, PPD, VIEW_START, VERTICAL)
      expect(updates.get('P')?.endPx).toBe(newStartPx)
    })

    it('before critical point: no cascade', () => {
      const t = makeTask('T', '2025-06-25', '2025-06-30', [rel('P', 'Exclusive')])
      const map = new Map([['P', pred], ['T', t]])
      const newStartPx = predNaturalEnd + PPD  // succ.start after pred's natural end
      const updates = computeCascadeUpdates(t, newStartPx, newStartPx + PPD * 5, map, PPD, VIEW_START, VERTICAL)
      expect(updates.has('P')).toBe(false)
    })
  })

  describe('pred (T) is dragged; succ has free start', () => {
    // succ is end-only; natural start = endDate − CARD_WIDTH
    const succ = makeTask('S', null, '2025-06-25')
    const succNaturalStart = px('2025-06-25') - CARD_WIDTH

    it('past critical point: succ.startPx follows T.end', () => {
      const t = makeTask('T', '2025-06-01', '2025-06-10', [], [rel('S', 'Exclusive')])
      const map = new Map([['S', succ], ['T', t]])
      const newEndPx = succNaturalStart + PPD * 2  // pred.end past succ's natural start
      const updates = computeCascadeUpdates(t, newEndPx - PPD * 9, newEndPx, map, PPD, VIEW_START, VERTICAL)
      expect(updates.get('S')?.startPx).toBe(newEndPx)
    })
  })
})

// ── computeCascadeUpdates — HaveStarted ──────────────────────────────────────
// Constraint: pred.start ≤ succ.start

describe('HaveStarted — cascade', () => {
  describe('succ (T) is dragged; pred has free start', () => {
    const pred = makeTask('P', null, '2025-06-20')
    const predNaturalStart = px('2025-06-20') - CARD_WIDTH

    it('past critical point: pred.startPx follows T.start', () => {
      const t = makeTask('T', '2025-06-25', '2025-06-30', [rel('P', 'HaveStarted')])
      const map = new Map([['P', pred], ['T', t]])
      const newStartPx = predNaturalStart - PPD * 2  // succ.start before pred's natural start
      const updates = computeCascadeUpdates(t, newStartPx, newStartPx + PPD * 5, map, PPD, VIEW_START, VERTICAL)
      expect(updates.get('P')?.startPx).toBe(newStartPx)
    })

    it('before critical point: no cascade', () => {
      const t = makeTask('T', '2025-06-25', '2025-06-30', [rel('P', 'HaveStarted')])
      const map = new Map([['P', pred], ['T', t]])
      const newStartPx = predNaturalStart + PPD  // succ.start after pred's natural start
      const updates = computeCascadeUpdates(t, newStartPx, newStartPx + PPD * 5, map, PPD, VIEW_START, VERTICAL)
      expect(updates.has('P')).toBe(false)
    })
  })

  describe('pred (T) is dragged; succ has free start', () => {
    const succ = makeTask('S', null, '2025-06-25')
    const succNaturalStart = px('2025-06-25') - CARD_WIDTH

    it('past critical point: succ.startPx follows T.start', () => {
      const t = makeTask('T', '2025-06-01', '2025-06-10', [], [rel('S', 'HaveStarted')])
      const map = new Map([['S', succ], ['T', t]])
      const newStartPx = succNaturalStart + PPD * 3  // pred.start past succ's natural start
      const updates = computeCascadeUpdates(t, newStartPx, newStartPx + PPD * 9, map, PPD, VIEW_START, VERTICAL)
      expect(updates.get('S')?.startPx).toBe(newStartPx)
    })
  })
})

// ── computeCascadeUpdates — HaveCompleted ────────────────────────────────────
// Constraint: pred.end ≤ succ.end

describe('HaveCompleted — cascade', () => {
  describe('succ (T) is dragged; pred has free end', () => {
    const pred = makeTask('P', '2025-06-05', null)
    const predNaturalEnd = px('2025-06-05') + CARD_WIDTH

    it('past critical point: pred.endPx follows T.end', () => {
      const t = makeTask('T', '2025-06-15', '2025-06-20', [rel('P', 'HaveCompleted')])
      const map = new Map([['P', pred], ['T', t]])
      const newEndPx = predNaturalEnd - PPD * 2  // succ.end before pred's natural end
      const updates = computeCascadeUpdates(t, newEndPx - PPD * 5, newEndPx, map, PPD, VIEW_START, VERTICAL)
      expect(updates.get('P')?.endPx).toBe(newEndPx)
    })

    it('before critical point: no cascade', () => {
      const t = makeTask('T', '2025-06-15', '2025-06-20', [rel('P', 'HaveCompleted')])
      const map = new Map([['P', pred], ['T', t]])
      const newEndPx = predNaturalEnd + PPD  // succ.end after pred's natural end
      const updates = computeCascadeUpdates(t, newEndPx - PPD * 5, newEndPx, map, PPD, VIEW_START, VERTICAL)
      expect(updates.has('P')).toBe(false)
    })
  })

  describe('pred (T) is dragged; succ has free end', () => {
    const succ = makeTask('S', '2025-06-25', null)
    const succNaturalEnd = px('2025-06-25') + CARD_WIDTH

    it('past critical point: succ.endPx follows T.end', () => {
      const t = makeTask('T', '2025-06-01', '2025-06-10', [], [rel('S', 'HaveCompleted')])
      const map = new Map([['S', succ], ['T', t]])
      const newEndPx = succNaturalEnd + PPD * 2  // pred.end past succ's natural end
      const updates = computeCascadeUpdates(t, newEndPx - PPD * 9, newEndPx, map, PPD, VIEW_START, VERTICAL)
      expect(updates.get('S')?.endPx).toBe(newEndPx)
    })
  })
})

// ── No cascade for fixed anchors ──────────────────────────────────────────────

describe('no cascade when related anchor is fixed', () => {
  it('HandOff: pred has fixed startDate — corridor clamps instead, no cascade', () => {
    const pred = makeTask('P', '2025-06-10', '2025-06-20')  // startDate is fixed
    const t = makeTask('T', null, '2025-06-25', [rel('P', 'HandOff')])
    const map = new Map([['P', pred], ['T', t]])
    // T.end way before pred.start — corridor would have clamped this, but cascade sees fixed anchor
    const updates = computeCascadeUpdates(t, null, px('2025-06-01'), map, PPD, VIEW_START, VERTICAL)
    expect(updates.has('P')).toBe(false)
  })

  it('Exclusive: pred has fixed endDate — no cascade', () => {
    const pred = makeTask('P', '2025-06-01', '2025-06-10')  // endDate is fixed
    const t = makeTask('T', '2025-06-08', '2025-06-15', [rel('P', 'Exclusive')])
    const map = new Map([['P', pred], ['T', t]])
    const updates = computeCascadeUpdates(t, px('2025-06-08'), px('2025-06-15'), map, PPD, VIEW_START, VERTICAL)
    expect(updates.has('P')).toBe(false)
  })
})

// ── Transitive cascade ────────────────────────────────────────────────────────

describe('transitive cascade', () => {
  it('chain: T → A (HandOff, A.start free) → B (HandOff, B.start free)', () => {
    // A is end-only, B is end-only
    // T is succ of A (HandOff: A.start ≤ T.end)
    // B is succ of A (HandOff: B.start... wait let me think)
    //
    // Actually: T dragged, T has HandOff pred A (A.start ≤ T.end)
    //           A has HandOff pred B (B.start ≤ A.end, A.end is fixed)
    //           But we want A.start to cascade, and B to be A's predecessor
    //
    // Simpler chain:
    //   HandOff: A.start ≤ T.end (T is succ, A is pred, A.start free)
    //   HandOff: B.start ≤ A.end (A is succ... hmm)
    //
    // Let's do: T → A (Exclusive: A.end ≤ T.start, A.end free)
    //           and A → B (Exclusive: B.end ≤ A.start, B.end free)
    // Both are predecessor chains with free ends.
    //
    // A: start-only (no endDate), B: start-only (no endDate)
    // T has pred A (Exclusive: A.end ≤ T.start)
    // A has pred B (Exclusive: B.end ≤ A.start)

    const bStart = '2025-06-01'
    const aStart = '2025-06-05'
    // B.natural_end = px(bStart) + CARD_WIDTH; A.natural_end = bNaturalEnd + 4*PPD (4 days gap)
    const bNaturalEnd = px(bStart) + CARD_WIDTH

    const b = makeTask('B', bStart, null, [], [rel('A', 'Exclusive')])
    const a = makeTask('A', aStart, null, [rel('B', 'Exclusive')], [rel('T', 'Exclusive')])
    const t = makeTask('T', '2025-06-20', '2025-06-25', [rel('A', 'Exclusive')])

    const map = new Map([['B', b], ['A', a], ['T', t]])

    // Choose T.start below both A.natural_end and B.natural_end to trigger transitive cascade.
    // bNaturalEnd = px(bStart)+CW, aNaturalEnd = bNaturalEnd + 4*PPD (aStart is 4 days after bStart).
    // Setting T.start = bNaturalEnd - PPD ensures it is < both natural ends.
    const newTStartBelowBoth = bNaturalEnd - PPD  // below both A.natural_end and B.natural_end

    const updates = computeCascadeUpdates(t, newTStartBelowBoth, newTStartBelowBoth + PPD * 5, map, PPD, VIEW_START, VERTICAL)

    // A should cascade (A.end follows T.start)
    expect(updates.get('A')?.endPx).toBe(newTStartBelowBoth)
    // B should cascade transitively (B.end follows A.start... wait)
    // After A cascades: A.effective_end = newTStartBelowBoth. B.natural_end > A.effective_end?
    // A.effective_start = px(aStart) (unchanged). A.effective_end = newTStartBelowBoth.
    // For B→A (Exclusive: B.end ≤ A.start): A.start is fixed at px(aStart). B.end is free.
    // Is A.effective_start < B.natural_end? px(aStart) < bNaturalEnd?
    // bNaturalEnd = px(bStart) + CW. px(aStart) = px(bStart) + 4*PPD.
    // px(aStart) < bNaturalEnd iff 4*PPD < CW. CW=180, PPD=40, 4*PPD=160 < 180. Yes!
    // So B.end cascades because A.effective_start (px(aStart)) < B.natural_end.
    // B.endPx = A.effective_start = px(aStart).
    expect(updates.get('B')?.endPx).toBe(px(aStart))
  })
})

// ── No cascade when no relationships ─────────────────────────────────────────

describe('no cascade for unrelated tasks', () => {
  it('returns empty map when task has no relationships', () => {
    const t = makeTask('T', '2025-06-10', '2025-06-20')
    const map = new Map([['T', t]])
    const updates = computeCascadeUpdates(t, px('2025-06-01'), px('2025-06-11'), map, PPD, VIEW_START, VERTICAL)
    expect(updates.size).toBe(0)
  })
})
