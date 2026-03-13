import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskList } from './TaskList'
import * as tasksSvc from '../../services/tasks'
import * as usersSvc from '../../services/users'
import type { Task } from '../../services/tasks'
import type { UserSummary } from '../../services/users'

vi.mock('../../services/tasks')
vi.mock('../../services/users')

const mockUsers: UserSummary[] = [
  { id: 'u1', username: 'alice', firstName: 'Alice', lastName: 'A', avatarUrl: null, completeTasks: 0, incompleteTasks: 1 },
]

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
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
    endType: 'None',
    endDate: null,
    duration: null,
    pinnedPosition: null,
    predecessorIds: [],
    successorIds: [],
    ...overrides,
  }
}

function renderList() {
  return render(
    <MemoryRouter>
      <TaskList />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.mocked(tasksSvc.getTasks).mockResolvedValue([])
  vi.mocked(usersSvc.getUsers).mockResolvedValue(mockUsers)
})

describe('TaskList', () => {
  it('shows empty state when no tasks', async () => {
    renderList()
    await waitFor(() => {
      expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
    })
  })

  it('renders task rows', async () => {
    vi.mocked(tasksSvc.getTasks).mockResolvedValue([
      makeTask({ title: 'Alpha', id: 'a' }),
      makeTask({ title: 'Beta',  id: 'b' }),
    ])
    renderList()
    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument()
      expect(screen.getByText('Beta')).toBeInTheDocument()
    })
  })

  it('sorts by title ascending when title header clicked', async () => {
    vi.mocked(tasksSvc.getTasks).mockResolvedValue([
      makeTask({ title: 'Zebra', id: 'z', endDate: '2099-01-02T00:00:00' }),
      makeTask({ title: 'Apple', id: 'a', endDate: '2099-01-01T00:00:00' }),
    ])
    renderList()
    const titleHeader = await screen.findByRole('button', { name: /title/i })
    fireEvent.click(titleHeader)
    const rows = screen.getAllByRole('row').slice(1) // skip header row
    expect(rows[0]).toHaveTextContent('Apple')
    expect(rows[1]).toHaveTextContent('Zebra')
  })

  it('shows "Today" divider when sorted by end date and tasks span today', async () => {
    const past = new Date()
    past.setDate(past.getDate() - 1)
    const future = new Date()
    future.setDate(future.getDate() + 10)

    vi.mocked(tasksSvc.getTasks).mockResolvedValue([
      makeTask({ title: 'Overdue', id: 'o', endDate: past.toISOString() }),
      makeTask({ title: 'Future',  id: 'f', endDate: future.toISOString() }),
    ])
    renderList()
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument()
    })
  })

  it('filters by text search', async () => {
    vi.mocked(tasksSvc.getTasks).mockResolvedValue([
      makeTask({ title: 'Fix login bug', id: '1' }),
      makeTask({ title: 'Add dashboard',  id: '2' }),
    ])
    renderList()
    await screen.findByText('Fix login bug')

    fireEvent.click(screen.getByRole('button', { name: /filters/i }))
    fireEvent.change(screen.getByPlaceholderText(/title or description/i), { target: { value: 'login' } })

    expect(screen.getByText('Fix login bug')).toBeInTheDocument()
    expect(screen.queryByText('Add dashboard')).not.toBeInTheDocument()
  })

  it('filters by priority', async () => {
    vi.mocked(tasksSvc.getTasks).mockResolvedValue([
      makeTask({ title: 'High task',   id: 'h', priority: 'High' }),
      makeTask({ title: 'Low task',    id: 'l', priority: 'Low' }),
    ])
    renderList()
    await screen.findByText('High task')

    fireEvent.click(screen.getByRole('button', { name: /filters/i }))
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'High' } })

    expect(screen.getByText('High task')).toBeInTheDocument()
    expect(screen.queryByText('Low task')).not.toBeInTheDocument()
  })

  it('filters by completion status', async () => {
    vi.mocked(tasksSvc.getTasks).mockResolvedValue([
      makeTask({ title: 'Done task',  id: 'd', status: 'Complete' }),
      makeTask({ title: 'Open task',  id: 'o', status: 'Incomplete' }),
    ])
    renderList()
    await screen.findByText('Done task')

    fireEvent.click(screen.getByRole('button', { name: /filters/i }))
    fireEvent.change(screen.getByLabelText('Completion'), { target: { value: 'Complete' } })

    expect(screen.getByText('Done task')).toBeInTheDocument()
    expect(screen.queryByText('Open task')).not.toBeInTheDocument()
  })

  it('toggles open-ended tasks to first position', async () => {
    const future = new Date()
    future.setDate(future.getDate() + 30)

    vi.mocked(tasksSvc.getTasks).mockResolvedValue([
      makeTask({ title: 'Dated',     id: 'd', endDate: future.toISOString() }),
      makeTask({ title: 'OpenEnded', id: 'o', endDate: null }),
    ])
    renderList()

    // Default: dated first
    await screen.findByText('Dated')
    let rows = screen.getAllByRole('row')
    const datedIdx    = rows.findIndex(r => r.textContent?.includes('Dated'))
    const openEndedIdx = rows.findIndex(r => r.textContent?.includes('OpenEnded'))
    expect(datedIdx).toBeLessThan(openEndedIdx)

    // Toggle: open-ended first
    fireEvent.click(screen.getByRole('button', { name: /open-ended/i }))
    rows = screen.getAllByRole('row')
    const newDatedIdx    = rows.findIndex(r => r.textContent?.includes('Dated'))
    const newOpenEndedIdx = rows.findIndex(r => r.textContent?.includes('OpenEnded'))
    expect(newOpenEndedIdx).toBeLessThan(newDatedIdx)
  })

  it('shows error state when tasks fail to load', async () => {
    vi.mocked(tasksSvc.getTasks).mockRejectedValue(new Error('Network error'))
    renderList()
    await waitFor(() => {
      expect(screen.getByText(/failed to load tasks/i)).toBeInTheDocument()
    })
  })
})
