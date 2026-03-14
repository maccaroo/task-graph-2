import { describe, it, expect } from 'vitest'
import { resolveRelationship, inferRelationshipType } from './TaskGraph.utils'

// ── inferRelationshipType ──────────────────────────────────────────────────

describe('inferRelationshipType', () => {
  it('end → start = Exclusive', () => {
    expect(inferRelationshipType('end', 'start')).toBe('Exclusive')
  })
  it('start → start = HaveStarted', () => {
    expect(inferRelationshipType('start', 'start')).toBe('HaveStarted')
  })
  it('end → end = HaveCompleted', () => {
    expect(inferRelationshipType('end', 'end')).toBe('HaveCompleted')
  })
  it('start → end = HandOff', () => {
    expect(inferRelationshipType('start', 'end')).toBe('HandOff')
  })
})

// ── resolveRelationship — same task guard ──────────────────────────────────

describe('resolveRelationship — same task', () => {
  it('returns null when sourceId === targetId', () => {
    expect(resolveRelationship('A', 'end', 200, 'A', 'start', 100)).toBeNull()
  })
})

// ── resolveRelationship — source is to the LEFT (srcAnchorX < tgtAnchorX) ─
// Source becomes predecessor; direction maps directly to anchor pair.

describe('resolveRelationship — source left of target', () => {
  it('end → start: Exclusive, source = predecessor', () => {
    const r = resolveRelationship('A', 'end', 100, 'B', 'start', 200)
    expect(r).toMatchObject({
      predecessorId: 'A', taskId: 'B',
      predAnchor: 'end', succAnchor: 'start',
      relType: 'Exclusive',
    })
  })

  it('start → start: HaveStarted, source = predecessor', () => {
    const r = resolveRelationship('A', 'start', 100, 'B', 'start', 200)
    expect(r).toMatchObject({
      predecessorId: 'A', taskId: 'B',
      predAnchor: 'start', succAnchor: 'start',
      relType: 'HaveStarted',
    })
  })

  it('end → end: HaveCompleted, source = predecessor', () => {
    const r = resolveRelationship('A', 'end', 100, 'B', 'end', 200)
    expect(r).toMatchObject({
      predecessorId: 'A', taskId: 'B',
      predAnchor: 'end', succAnchor: 'end',
      relType: 'HaveCompleted',
    })
  })

  it('start → end: HandOff, source = predecessor', () => {
    const r = resolveRelationship('A', 'start', 100, 'B', 'end', 200)
    expect(r).toMatchObject({
      predecessorId: 'A', taskId: 'B',
      predAnchor: 'start', succAnchor: 'end',
      relType: 'HandOff',
    })
  })
})

// ── resolveRelationship — source is to the RIGHT (srcAnchorX > tgtAnchorX) ─
// Target becomes predecessor; the anchor roles are swapped accordingly.

describe('resolveRelationship — source right of target', () => {
  it('end → start: target end is predecessor → Exclusive', () => {
    // Dragging B.end (x=300) onto A.start (x=100): A is left so A = predecessor
    // but here source=B.end is right, target=A.start is left → target is predecessor
    const r = resolveRelationship('B', 'end', 300, 'A', 'start', 100)
    expect(r).toMatchObject({
      predecessorId: 'A', taskId: 'B',
      predAnchor: 'start', succAnchor: 'end',
      relType: 'HandOff',
    })
  })

  it('start → end: target end is leftmost → target = predecessor → HandOff inverted', () => {
    // source=B.start(x=300), target=A.end(x=100): target.end < source.start → target = predecessor
    // predAnchor='end', succAnchor='start' → Exclusive
    const r = resolveRelationship('B', 'start', 300, 'A', 'end', 100)
    expect(r).toMatchObject({
      predecessorId: 'A', taskId: 'B',
      predAnchor: 'end', succAnchor: 'start',
      relType: 'Exclusive',
    })
  })

  it('start → start: target start is leftmost → target = predecessor → HaveStarted', () => {
    const r = resolveRelationship('B', 'start', 300, 'A', 'start', 100)
    expect(r).toMatchObject({
      predecessorId: 'A', taskId: 'B',
      predAnchor: 'start', succAnchor: 'start',
      relType: 'HaveStarted',
    })
  })

  it('end → end: target end is leftmost → target = predecessor → HaveCompleted', () => {
    const r = resolveRelationship('B', 'end', 300, 'A', 'end', 100)
    expect(r).toMatchObject({
      predecessorId: 'A', taskId: 'B',
      predAnchor: 'end', succAnchor: 'end',
      relType: 'HaveCompleted',
    })
  })
})

// ── resolveRelationship — equal x positions ────────────────────────────────
// Tie-break: the task whose dragged anchor is the *end* side is the predecessor.

describe('resolveRelationship — equal anchor x positions', () => {
  it('source=end, target=start: source.end is tie-breaker → source = predecessor → Exclusive', () => {
    const r = resolveRelationship('A', 'end', 150, 'B', 'start', 150)
    expect(r).toMatchObject({
      predecessorId: 'A', taskId: 'B',
      predAnchor: 'end', succAnchor: 'start',
      relType: 'Exclusive',
    })
  })

  it('source=end, target=end: source.end is tie-breaker → source = predecessor → HaveCompleted', () => {
    const r = resolveRelationship('A', 'end', 150, 'B', 'end', 150)
    expect(r).toMatchObject({
      predecessorId: 'A', taskId: 'B',
      predAnchor: 'end', succAnchor: 'end',
      relType: 'HaveCompleted',
    })
  })

  it('source=start, target=start: source.start → target is tie-breaker predecessor → HaveStarted', () => {
    // sourceAnchor='start' → target becomes predecessor
    const r = resolveRelationship('A', 'start', 150, 'B', 'start', 150)
    expect(r).toMatchObject({
      predecessorId: 'B', taskId: 'A',
      predAnchor: 'start', succAnchor: 'start',
      relType: 'HaveStarted',
    })
  })

  it('source=start, target=end: target.end is tie-breaker → target = predecessor → Exclusive', () => {
    // sourceAnchor='start' → target becomes predecessor; predAnchor='end', succAnchor='start'
    const r = resolveRelationship('A', 'start', 150, 'B', 'end', 150)
    expect(r).toMatchObject({
      predecessorId: 'B', taskId: 'A',
      predAnchor: 'end', succAnchor: 'start',
      relType: 'Exclusive',
    })
  })
})
