import { describe, it, expect } from 'vitest'
import { snapDate } from './dragSnap'
import type { Task } from '../../services/tasks'

// 40 px/day → tick = 1 day, threshold = 8px = 0.2 days = 4.8 hours
const PPD = 40

function makeTask(startDate: string | null, endDate: string | null): Task {
  return { id: 'x', title: '', description: null, assigneeId: null, assigneeUsername: null,
    status: 'Incomplete', priority: 'Medium', tags: [], startType: 'Fixed', startDate,
    endType: 'Fixed', endDate, duration: null, predecessorIds: [], successorIds: [],
    predecessors: [], successors: [] }
}

const NO_TASKS: Task[] = []

describe('snapDate — tick snapping (40 px/day → daily ticks)', () => {
  it('returns the exact tick when already on a tick', () => {
    const d = new Date('2025-06-10T00:00:00.000Z')
    const result = snapDate(d, PPD, NO_TASKS)
    expect(result.getTime()).toBe(d.getTime())
  })

  it('snaps to the nearest tick when within threshold', () => {
    // 0.1 days off = 4px — within threshold of 8px
    const base = new Date('2025-06-10T00:00:00.000Z')
    const close = new Date(base.getTime() + 0.1 * 86_400_000)
    const result = snapDate(close, PPD, NO_TASKS)
    expect(result.getTime()).toBe(base.getTime())
  })

  it('does NOT snap when beyond threshold', () => {
    // 0.25 days off = 10px — beyond threshold of 8px
    const base = new Date('2025-06-10T00:00:00.000Z')
    const far = new Date(base.getTime() + 0.25 * 86_400_000)
    const result = snapDate(far, PPD, NO_TASKS)
    expect(result.getTime()).toBe(far.getTime())
  })
})

describe('snapDate — task-date snapping', () => {
  it('snaps to a nearby task start date when within threshold', () => {
    const taskDate = new Date('2025-06-15T00:00:00.000Z')
    const task = makeTask('2025-06-15T00:00:00.000Z', null)
    // 0.1 days off = 4px from task date, closer than any tick
    const rawDate = new Date(taskDate.getTime() + 0.1 * 86_400_000)
    const result = snapDate(rawDate, PPD, [task])
    expect(result.getTime()).toBe(taskDate.getTime())
  })

  it('snaps to task end date when within threshold', () => {
    const taskEndDate = new Date('2025-06-20T00:00:00.000Z')
    const task = makeTask(null, '2025-06-20T00:00:00.000Z')
    const rawDate = new Date(taskEndDate.getTime() + 0.15 * 86_400_000)
    const result = snapDate(rawDate, PPD, [task])
    expect(result.getTime()).toBe(taskEndDate.getTime())
  })

  it('prefers the closer snap target between tick and task date', () => {
    // Tick at 2025-06-10, task date at 2025-06-10T01:00:00Z (1/24 day = 1.67px from tick)
    const tick = new Date('2025-06-10T00:00:00.000Z')
    const taskDate = new Date('2025-06-10T01:00:00.000Z')
    const task = makeTask(taskDate.toISOString(), null)
    // Raw date is 30 min before taskDate (0.5/24 day = 0.83px from taskDate, 1.5/24 day = 2.5px from tick)
    const rawDate = new Date(taskDate.getTime() - 0.5 * 3_600_000)
    const result = snapDate(rawDate, PPD, [task])
    // taskDate is closer (0.83px) than tick (2.5px)
    expect(result.getTime()).toBe(taskDate.getTime())
    // Sanity: without the task, it would snap to the tick
    const noTaskResult = snapDate(rawDate, PPD, NO_TASKS)
    expect(noTaskResult.getTime()).toBe(tick.getTime())
  })

  it('returns raw date when no snap target is within threshold', () => {
    const raw = new Date('2025-06-10T06:00:00.000Z') // 0.25 days from midnight = 10px, beyond 8px
    const result = snapDate(raw, PPD, NO_TASKS)
    expect(result.getTime()).toBe(raw.getTime())
  })
})
