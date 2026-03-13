import { describe, it, expect } from 'vitest'
import { computeDueStatus, computeDueStatusForDate } from './taskStatus'
import type { Task } from '../services/tasks'

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: '1', title: 'T', description: null,
    assigneeId: null, assigneeUsername: null,
    status: 'Incomplete', priority: 'Medium', tags: [],
    startType: 'None', startDate: null,
    endType: 'None', endDate: null,
    duration: null, pinnedPosition: null,
    predecessorIds: [], successorIds: [],
    ...overrides,
  }
}

function isoOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

describe('computeDueStatus', () => {
  it('returns completed for complete tasks', () => {
    expect(computeDueStatus(task({ status: 'Complete', endDate: isoOffset(-1) }))).toBe('completed')
  })

  it('returns none when no end date', () => {
    expect(computeDueStatus(task())).toBe('none')
  })

  it('returns due-today for today', () => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    expect(computeDueStatus(task({ endDate: today.toISOString() }))).toBe('due-today')
  })

  it('returns due-soon for 1–14 days ahead', () => {
    expect(computeDueStatus(task({ endDate: isoOffset(7)  }))).toBe('due-soon')
    expect(computeDueStatus(task({ endDate: isoOffset(14) }))).toBe('due-soon')
  })

  it('returns upcoming for > 14 days ahead', () => {
    expect(computeDueStatus(task({ endDate: isoOffset(15) }))).toBe('upcoming')
  })

  it('returns overdue for 1–7 days past', () => {
    expect(computeDueStatus(task({ endDate: isoOffset(-1) }))).toBe('overdue')
    expect(computeDueStatus(task({ endDate: isoOffset(-7) }))).toBe('overdue')
  })

  it('returns critical for > 7 days past', () => {
    expect(computeDueStatus(task({ endDate: isoOffset(-8) }))).toBe('critical')
  })
})

describe('computeDueStatusForDate', () => {
  it('returns completed for Complete status regardless of date', () => {
    expect(computeDueStatusForDate(isoOffset(5), 'Complete')).toBe('completed')
  })

  it('returns critical for date > 7 days past', () => {
    expect(computeDueStatusForDate(isoOffset(-10), 'Incomplete')).toBe('critical')
  })

  it('returns overdue for date 1–7 days past', () => {
    expect(computeDueStatusForDate(isoOffset(-3), 'Incomplete')).toBe('overdue')
  })

  it('returns due-today for today', () => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    expect(computeDueStatusForDate(today.toISOString(), 'Incomplete')).toBe('due-today')
  })

  it('returns due-soon for 1–14 days ahead', () => {
    expect(computeDueStatusForDate(isoOffset(7), 'Incomplete')).toBe('due-soon')
  })

  it('returns upcoming for > 14 days ahead', () => {
    expect(computeDueStatusForDate(isoOffset(20), 'Incomplete')).toBe('upcoming')
  })
})
