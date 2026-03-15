import { describe, it, expect } from 'vitest'
import type { Task } from '../../services/tasks'
import {
  dateToX,
  xToDate,
  computeViewRange,
  computeAutoLayout,
  CANVAS_PAD_X,
  CANVAS_PAD_Y,
  CARD_WIDTH,
  CARD_HEIGHT,
  ROW_HEIGHT,
  MS_PER_DAY,
} from './graphLayout'

const BASE_TASK: Task = {
  id: 't1',
  title: 'Task 1',
  description: null,
  assigneeId: null,
  assigneeUsername: null,
  status: 'Incomplete',
  priority: 'Medium',
  tags: [],
  startType: 'None',
  startDate: null,
  endType: 'Fixed',
  endDate: null,
  duration: null,
  predecessorIds: [],
  successorIds: [],
  predecessors: [],
  successors: [],
}

function makeTask(overrides: Partial<Task>): Task {
  return { ...BASE_TASK, ...overrides }
}

describe('dateToX', () => {
  it('converts viewStart to CANVAS_PAD_X', () => {
    const viewStart = new Date('2025-01-01')
    expect(dateToX(viewStart, viewStart, 40)).toBe(CANVAS_PAD_X)
  })

  it('shifts right by pixelsPerDay for each day', () => {
    const viewStart = new Date('2025-01-01')
    const date = new Date('2025-01-11') // 10 days later
    expect(dateToX(date, viewStart, 40)).toBeCloseTo(CANVAS_PAD_X + 10 * 40)
  })

  it('accepts a string date', () => {
    const viewStart = new Date('2025-01-01')
    expect(dateToX('2025-01-01', viewStart, 40)).toBe(CANVAS_PAD_X)
  })
})

describe('xToDate', () => {
  it('round-trips with dateToX', () => {
    const viewStart = new Date('2025-01-01')
    const date = new Date('2025-03-15')
    const x = dateToX(date, viewStart, 40)
    const back = xToDate(x, viewStart, 40)
    expect(back.getTime()).toBeCloseTo(date.getTime(), -3)
  })
})

describe('computeViewRange', () => {
  it('returns a range padded around task dates', () => {
    const tasks = [
      makeTask({ id: 't1', endDate: '2025-06-01' }),
      makeTask({ id: 't2', endDate: '2025-08-01' }),
    ]
    const { viewStart, viewEnd } = computeViewRange(tasks)
    expect(viewStart.getTime()).toBeLessThan(new Date('2025-06-01').getTime())
    expect(viewEnd.getTime()).toBeGreaterThan(new Date('2025-08-01').getTime())
  })

  it('returns a default range when no tasks have dates', () => {
    const tasks = [makeTask({ id: 't1' })]
    const { viewStart, viewEnd } = computeViewRange(tasks)
    expect(viewEnd.getTime()).toBeGreaterThan(viewStart.getTime())
  })
})

describe('computeAutoLayout', () => {
  it('places tasks with dates on the canvas', () => {
    const viewStart = new Date('2025-01-01')
    const tasks = [makeTask({ id: 't1', endDate: '2025-02-01' })]
    const positions = computeAutoLayout(tasks, viewStart, 40)
    expect(positions.has('t1')).toBe(true)
  })

  it('positions tasks without an end date at end of present week', () => {
    const viewStart = new Date('2025-01-01')
    // Both open-ended (no dates) and start-only tasks should be positioned here
    const tasks = [
      makeTask({ id: 't1' }),
      makeTask({ id: 't2', startDate: '2025-01-15' }),
    ]
    const positions = computeAutoLayout(tasks, viewStart, 40)
    expect(positions.has('t1')).toBe(true)
    expect(positions.has('t2')).toBe(true)
    expect(positions.get('t1')!.x).toBeGreaterThan(CANVAS_PAD_X - CARD_WIDTH)
    expect(positions.get('t2')!.x).toBeGreaterThan(CANVAS_PAD_X - CARD_WIDTH)
  })

  it('aligns task right edge to end date x position', () => {
    const viewStart = new Date('2025-01-01')
    const endDate = '2025-01-31' // 30 days after viewStart
    const pixelsPerDay = 40
    const tasks = [makeTask({ id: 't1', endDate })]
    const positions = computeAutoLayout(tasks, viewStart, pixelsPerDay)
    const pos = positions.get('t1')!
    const expectedEndX = CANVAS_PAD_X + 30 * pixelsPerDay
    expect(pos.x).toBeCloseTo(expectedEndX - CARD_WIDTH, 0)
    expect(pos.width).toBe(CARD_WIDTH)
  })

  it('aligns start side to start date for start-only task', () => {
    const viewStart = new Date('2025-01-01')
    const startDate = '2025-01-11' // 10 days after viewStart
    const pixelsPerDay = 40
    const tasks = [makeTask({ id: 't1', startDate, startType: 'Fixed' })]
    const positions = computeAutoLayout(tasks, viewStart, pixelsPerDay)
    const pos = positions.get('t1')!
    const expectedStartX = CANVAS_PAD_X + 10 * pixelsPerDay
    expect(pos.x).toBeCloseTo(expectedStartX, 0)
    expect(pos.width).toBe(CARD_WIDTH)
  })

  it('spans both-constrained task from start to end date', () => {
    const viewStart = new Date('2025-01-01')
    const startDate = '2025-01-11' // 10 days after viewStart
    const endDate   = '2025-02-10' // 40 days after viewStart
    const pixelsPerDay = 40
    const tasks = [makeTask({ id: 't1', startDate, startType: 'Fixed', endDate })]
    const positions = computeAutoLayout(tasks, viewStart, pixelsPerDay)
    const pos = positions.get('t1')!
    const expectedStartX = CANVAS_PAD_X + 10 * pixelsPerDay
    const expectedEndX   = CANVAS_PAD_X + 40 * pixelsPerDay
    expect(pos.x).toBeCloseTo(expectedStartX, 0)
    expect(pos.width).toBeCloseTo(expectedEndX - expectedStartX, 0)
  })

  it('uses standard width for open-ended task', () => {
    const viewStart = new Date('2025-01-01')
    const tasks = [makeTask({ id: 't1' })]
    const positions = computeAutoLayout(tasks, viewStart, 40)
    expect(positions.get('t1')!.width).toBe(CARD_WIDTH)
  })

  it('places overlapping tasks in separate rows', () => {
    const viewStart = new Date('2025-01-01')
    const pixelsPerDay = 40
    // Two tasks with same end date — they'll overlap in row 0, so second goes to row 1
    const tasks = [
      makeTask({ id: 't1', endDate: '2025-02-01' }),
      makeTask({ id: 't2', endDate: '2025-02-01' }),
    ]
    const positions = computeAutoLayout(tasks, viewStart, pixelsPerDay)
    const p1 = positions.get('t1')!
    const p2 = positions.get('t2')!
    expect(p1.y).not.toBe(p2.y)
    expect(Math.abs(p1.y - p2.y)).toBeGreaterThanOrEqual(ROW_HEIGHT - 1)
  })

  it('places first task in first row', () => {
    const viewStart = new Date('2025-01-01')
    const tasks = [makeTask({ id: 't1', endDate: '2025-02-01' })]
    const positions = computeAutoLayout(tasks, viewStart, 40)
    const pos = positions.get('t1')!
    expect(pos.y).toBe(CANVAS_PAD_Y)
  })

  it('places predecessors before successors (topological order)', () => {
    const viewStart = new Date('2025-01-01')
    const pixelsPerDay = 40
    const tasks = [
      makeTask({ id: 'pred', endDate: '2025-01-15', successorIds: ['succ'] }),
      makeTask({ id: 'succ', endDate: '2025-02-15', predecessorIds: ['pred'] }),
    ]
    const positions = computeAutoLayout(tasks, viewStart, pixelsPerDay)
    const predPos = positions.get('pred')!
    const succPos = positions.get('succ')!
    // Successor should be to the right of predecessor
    expect(succPos.x).toBeGreaterThan(predPos.x)
  })
})

describe('constants', () => {
  it('exports sensible values', () => {
    expect(CANVAS_PAD_X).toBeGreaterThan(0)
    expect(CANVAS_PAD_Y).toBeGreaterThan(0)
    expect(CARD_WIDTH).toBeGreaterThan(0)
    expect(ROW_HEIGHT).toBeGreaterThan(CARD_HEIGHT) // rows taller than card height
    expect(MS_PER_DAY).toBe(86_400_000)
  })
})
