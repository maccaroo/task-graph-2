import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { TaskGraphItem } from './TaskGraphItem'
import { CARD_WIDTH } from './graphLayout'
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
  predecessorIds: [],
  successorIds: [],
  predecessors: [],
  successors: [],
}

function makeTask(overrides: Partial<Task>): Task {
  return { ...BASE, ...overrides }
}

function renderItem(
  task: Task,
  taskMap = new Map<string, Task>([[task.id, task]]),
  width?: number,
) {
  const onSelect = vi.fn()
  const onRelationDragStart = vi.fn()

  const result = render(
    <TaskGraphItem
      task={task}
      taskMap={taskMap}
      x={100}
      y={100}
      width={width}
      selected={false}
      isDragTarget={false}
      onSelect={onSelect}
      onRelationDragStart={onRelationDragStart}
    />,
  )

  return { onSelect, onRelationDragStart, container: result.container }
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

  it('shows both predecessor and successor counts in separate slots', () => {
    renderItem(makeTask({ predecessorIds: ['p1'], successorIds: ['s1'] }))
    expect(screen.getByText(/← 1/)).toBeInTheDocument()
    expect(screen.getByText(/1 →/)).toBeInTheDocument()
  })

  it('shows no deps line when task has no predecessors or successors', () => {
    renderItem(BASE)
    expect(screen.queryByText(/←|→/)).toBeNull()
  })

  it('renders start anchor widget button', () => {
    renderItem(BASE)
    expect(screen.getByLabelText('Start anchor')).toBeInTheDocument()
  })

  it('renders end anchor widget button', () => {
    renderItem(BASE)
    expect(screen.getByLabelText('End anchor')).toBeInTheDocument()
  })

  it('calls onRelationDragStart with start anchor on start widget mousedown', () => {
    const { onRelationDragStart } = renderItem(BASE)
    fireEvent.mouseDown(screen.getByLabelText('Start anchor'), { button: 0, clientX: 50, clientY: 50 })
    expect(onRelationDragStart).toHaveBeenCalledWith('task-1', 'start', 50, 50)
  })

  it('calls onRelationDragStart with end anchor on end widget mousedown', () => {
    const { onRelationDragStart } = renderItem(BASE)
    fireEvent.mouseDown(screen.getByLabelText('End anchor'), { button: 0, clientX: 250, clientY: 50 })
    expect(onRelationDragStart).toHaveBeenCalledWith('task-1', 'end', 250, 50)
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
        onSelect={vi.fn()} onRelationDragStart={vi.fn()} />,
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
        onSelect={vi.fn()} onRelationDragStart={vi.fn()} />,
    )
    expect((container.firstChild as Element)?.className).not.toMatch(/gradient/)
  })
})

describe('constraint buffer styling (T7)', () => {
  it('applies constrainedStart when startDate is set', () => {
    const task = makeTask({ startDate: new Date(Date.now()).toISOString(), startType: 'Fixed' })
    const { container } = renderItem(task)
    expect((container.firstChild as Element)?.className).toMatch(/constrainedStart/)
  })

  it('applies unconstrainedStart when startDate is not set', () => {
    const { container } = renderItem(BASE)
    expect((container.firstChild as Element)?.className).toMatch(/unconstrainedStart/)
  })

  it('applies constrainedEnd when endDate is set', () => {
    const { container } = renderItem(BASE) // BASE has endDate
    expect((container.firstChild as Element)?.className).toMatch(/constrainedEnd/)
  })

  it('applies unconstrainedEnd when endDate is not set', () => {
    const task = makeTask({ endDate: null, endType: 'None' })
    const { container } = renderItem(task)
    expect((container.firstChild as Element)?.className).toMatch(/unconstrainedEnd/)
  })
})

describe('reduced display and hover-expand (T8, T10)', () => {
  it('applies reduced class when both dates set and width < CARD_WIDTH', () => {
    const start = new Date(Date.now()).toISOString()
    const end   = new Date(Date.now() + 86_400_000).toISOString() // 1 day span → narrow
    const task  = makeTask({ startDate: start, startType: 'Fixed', endDate: end })
    const { container } = renderItem(task, undefined, CARD_WIDTH / 2)
    expect((container.firstChild as Element)?.className).toMatch(/reduced/)
  })

  it('does not apply reduced class when width >= CARD_WIDTH', () => {
    const start = new Date(Date.now()).toISOString()
    const end   = new Date(Date.now() + 30 * 86_400_000).toISOString()
    const task  = makeTask({ startDate: start, startType: 'Fixed', endDate: end })
    const { container } = renderItem(task, undefined, CARD_WIDTH * 2)
    expect((container.firstChild as Element)?.className).not.toMatch(/reduced/)
  })

  it('expands reduced card to standard width after 500 ms hover', async () => {
    vi.useFakeTimers()
    const start = new Date(Date.now()).toISOString()
    const end   = new Date(Date.now() + 86_400_000).toISOString()
    const task  = makeTask({ startDate: start, startType: 'Fixed', endDate: end })
    const { container } = renderItem(task, undefined, CARD_WIDTH / 2)
    const card = container.firstChild as HTMLElement

    fireEvent.mouseEnter(card)
    expect(card.className).not.toMatch(/expanded/)

    await act(async () => { vi.advanceTimersByTime(500) })
    expect(card.className).toMatch(/expanded/)

    fireEvent.mouseLeave(card)
    expect(card.className).not.toMatch(/expanded/)
    vi.useRealTimers()
  })

  it('does not expand before 500 ms', async () => {
    vi.useFakeTimers()
    const start = new Date(Date.now()).toISOString()
    const end   = new Date(Date.now() + 86_400_000).toISOString()
    const task  = makeTask({ startDate: start, startType: 'Fixed', endDate: end })
    const { container } = renderItem(task, undefined, CARD_WIDTH / 2)
    const card = container.firstChild as HTMLElement

    fireEvent.mouseEnter(card)
    await act(async () => { vi.advanceTimersByTime(499) })
    expect(card.className).not.toMatch(/expanded/)
    vi.useRealTimers()
  })
})
