import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskGraphItem } from './TaskGraphItem'
import type { Task } from '../../services/tasks'

const BASE: Task = {
  id: 'task-1',
  title: 'Test Task',
  description: null,
  assigneeId: null,
  assigneeUsername: null,
  status: 'Incomplete',
  priority: 'Medium',
  tags: [],
  startType: 'None',
  startDate: null,
  endType: 'Fixed',
  endDate: new Date(Date.now() + 5 * 86_400_000).toISOString(),
  duration: null,
  pinnedPosition: null,
  predecessorIds: [],
  successorIds: [],
}

function makeTask(overrides: Partial<Task>): Task {
  return { ...BASE, ...overrides }
}

function renderItem(task: Task, taskMap = new Map<string, Task>([[task.id, task]])) {
  const onSelect = vi.fn()
  const onDragEnd = vi.fn()
  const onRelationDragStart = vi.fn()

  render(
    <TaskGraphItem
      task={task}
      taskMap={taskMap}
      x={100}
      y={100}
      selected={false}
      isDragTarget={false}
      onSelect={onSelect}
      onDragEnd={onDragEnd}
      onRelationDragStart={onRelationDragStart}
    />,
  )

  return { onSelect, onDragEnd, onRelationDragStart }
}

describe('TaskGraphItem', () => {
  it('renders the task title', () => {
    renderItem(BASE)
    expect(screen.getByText('Test Task')).toBeInTheDocument()
  })

  it('shows time label for upcoming task', () => {
    renderItem(BASE)
    expect(screen.getByText(/\dd left/)).toBeInTheDocument()
  })

  it('shows "due today" for task due today', () => {
    // Use a date 1 second from now — rounds to 0 days → "due today"
    renderItem(makeTask({ endDate: new Date(Date.now() + 1000).toISOString() }))
    expect(screen.getByText('due today')).toBeInTheDocument()
  })

  it('shows overdue label for past task', () => {
    renderItem(makeTask({ endDate: new Date(Date.now() - 3 * 86_400_000).toISOString() }))
    expect(screen.getByText(/overdue/i)).toBeInTheDocument()
  })

  it('does not show time label for completed task', () => {
    renderItem(makeTask({ status: 'Complete' }))
    expect(screen.queryByText(/left|overdue|due today/)).toBeNull()
  })

  it('shows predecessor count when predecessors exist', () => {
    renderItem(makeTask({ predecessorIds: ['p1', 'p2'] }))
    expect(screen.getByText(/← 2/)).toBeInTheDocument()
  })

  it('shows successor count when successors exist', () => {
    renderItem(makeTask({ successorIds: ['s1'] }))
    expect(screen.getByText(/1 →/)).toBeInTheDocument()
  })

  it('shows both predecessor and successor counts on one line', () => {
    renderItem(makeTask({ predecessorIds: ['p1'], successorIds: ['s1'] }))
    expect(screen.getByText(/← 1.*1 →/)).toBeInTheDocument()
  })

  it('shows no deps line when task has no predecessors or successors', () => {
    renderItem(BASE)
    expect(screen.queryByText(/←|→/)).toBeNull()
  })

  it('renders predecessor widget button', () => {
    renderItem(BASE)
    expect(screen.getByTitle('Drag to set a predecessor')).toBeInTheDocument()
  })

  it('renders successor widget button', () => {
    renderItem(BASE)
    expect(screen.getByTitle('Drag to set a successor')).toBeInTheDocument()
  })

  it('calls onRelationDragStart with predecessor type on left widget mousedown', () => {
    const { onRelationDragStart } = renderItem(BASE)
    fireEvent.mouseDown(screen.getByTitle('Drag to set a predecessor'), { button: 0, clientX: 50, clientY: 50 })
    expect(onRelationDragStart).toHaveBeenCalledWith('task-1', 'predecessor', 50, 50)
  })

  it('calls onRelationDragStart with successor type on right widget mousedown', () => {
    const { onRelationDragStart } = renderItem(BASE)
    fireEvent.mouseDown(screen.getByTitle('Drag to set a successor'), { button: 0, clientX: 250, clientY: 50 })
    expect(onRelationDragStart).toHaveBeenCalledWith('task-1', 'successor', 250, 50)
  })

  it('applies dragTarget class when isDragTarget is true', () => {
    const { container } = render(
      <TaskGraphItem
        task={BASE}
        taskMap={new Map([[BASE.id, BASE]])}
        x={0} y={0}
        selected={false}
        isDragTarget={true}
        onSelect={vi.fn()}
        onDragEnd={vi.fn()}
        onRelationDragStart={vi.fn()}
      />,
    )
    // CSS modules hash class names — check that the className contains "dragTarget"
    expect((container.firstChild as Element)?.className).toMatch(/dragTarget/)
  })
})

describe('hybrid gradient border (T6)', () => {
  it('applies gradient class when startDate and endDate span different time periods', () => {
    // startDate close (due-soon/green), endDate far in future (upcoming/blue)
    const soonStart   = new Date(Date.now() +  5 * 86_400_000).toISOString()
    const futureEnd   = new Date(Date.now() + 30 * 86_400_000).toISOString()
    const task = makeTask({ startDate: soonStart, endDate: futureEnd, startType: 'Fixed', endType: 'Fixed' })
    const { container } = render(
      <TaskGraphItem task={task} taskMap={new Map([[task.id, task]])}
        x={0} y={0} selected={false} isDragTarget={false}
        onSelect={vi.fn()} onDragEnd={vi.fn()} onRelationDragStart={vi.fn()} />,
    )
    // CSS modules hash class names — check className contains "gradient"
    expect((container.firstChild as Element)?.className).toMatch(/gradient/)
  })

  it('does NOT apply gradient when start and end share the same period', () => {
    const start = new Date(Date.now() + 3 * 86_400_000).toISOString()
    const end   = new Date(Date.now() + 6 * 86_400_000).toISOString()
    const task  = makeTask({ startDate: start, endDate: end, startType: 'Fixed', endType: 'Fixed' })
    const { container } = render(
      <TaskGraphItem task={task} taskMap={new Map([[task.id, task]])}
        x={0} y={0} selected={false} isDragTarget={false}
        onSelect={vi.fn()} onDragEnd={vi.fn()} onRelationDragStart={vi.fn()} />,
    )
    expect((container.firstChild as Element)?.className).not.toMatch(/gradient/)
  })
})
