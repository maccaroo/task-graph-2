import { describe, it, expect, vi } from 'vitest'
import type { CreateTaskData } from '../../services/tasks'

// Mock the tasks service before importing commands
vi.mock('../../services/tasks', () => ({
  updateTask: vi.fn(async () => ({})),
}))

import { updateTask } from '../../services/tasks'
import { positionCommand } from './PositionCommand'
import { updateTaskCommand } from './UpdateTaskCommand'

const mockUpdateTask = updateTask as ReturnType<typeof vi.fn>

const BASE: CreateTaskData = {
  title: 'Task A',
  status: 'Incomplete',
  priority: 'Medium',
  tags: [],
  startType: 'Fixed',
  startDate: '2025-06-01T00:00:00.000Z',
  endType: 'Fixed',
  endDate: '2025-06-05T00:00:00.000Z',
}

beforeEach(() => { mockUpdateTask.mockClear() })

// ── PositionCommand ──────────────────────────────────────────────────────────

describe('PositionCommand', () => {
  const taskBefore: CreateTaskData = { ...BASE }
  const taskAfter:  CreateTaskData = { ...BASE, startDate: '2025-06-03T00:00:00.000Z', endDate: '2025-06-07T00:00:00.000Z' }

  const relBefore: CreateTaskData = { ...BASE, title: 'Cascade', startDate: '2025-06-06T00:00:00.000Z' }
  const relAfter:  CreateTaskData = { ...relBefore, startDate: '2025-06-08T00:00:00.000Z' }

  const cascadeBefore = new Map([['rel-1', relBefore]])
  const cascadeAfter  = new Map([['rel-1', relAfter]])

  it('undo calls updateTask with taskBefore then cascadeBefore', async () => {
    const cmd = positionCommand('task-1', taskBefore, taskAfter, cascadeBefore, cascadeAfter)
    await cmd.undo()

    expect(mockUpdateTask).toHaveBeenCalledTimes(2)
    expect(mockUpdateTask).toHaveBeenNthCalledWith(1, 'task-1', taskBefore)
    expect(mockUpdateTask).toHaveBeenNthCalledWith(2, 'rel-1', relBefore)
  })

  it('redo calls updateTask with taskAfter then cascadeAfter', async () => {
    const cmd = positionCommand('task-1', taskBefore, taskAfter, cascadeBefore, cascadeAfter)
    await cmd.redo()

    expect(mockUpdateTask).toHaveBeenCalledTimes(2)
    expect(mockUpdateTask).toHaveBeenNthCalledWith(1, 'task-1', taskAfter)
    expect(mockUpdateTask).toHaveBeenNthCalledWith(2, 'rel-1', relAfter)
  })

  it('undo with no cascade tasks calls updateTask once', async () => {
    const cmd = positionCommand('task-1', taskBefore, taskAfter, new Map(), new Map())
    await cmd.undo()
    expect(mockUpdateTask).toHaveBeenCalledOnce()
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', taskBefore)
  })

  it('redo with no cascade tasks calls updateTask once', async () => {
    const cmd = positionCommand('task-1', taskBefore, taskAfter, new Map(), new Map())
    await cmd.redo()
    expect(mockUpdateTask).toHaveBeenCalledOnce()
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', taskAfter)
  })
})

// ── UpdateTaskCommand ────────────────────────────────────────────────────────

describe('UpdateTaskCommand', () => {
  const before: CreateTaskData = { ...BASE, title: 'Original title' }
  const after:  CreateTaskData = { ...BASE, title: 'Updated title' }

  it('undo calls updateTask with before', async () => {
    const cmd = updateTaskCommand('task-2', before, after)
    await cmd.undo()
    expect(mockUpdateTask).toHaveBeenCalledOnce()
    expect(mockUpdateTask).toHaveBeenCalledWith('task-2', before)
  })

  it('redo calls updateTask with after', async () => {
    const cmd = updateTaskCommand('task-2', before, after)
    await cmd.redo()
    expect(mockUpdateTask).toHaveBeenCalledOnce()
    expect(mockUpdateTask).toHaveBeenCalledWith('task-2', after)
  })
})
