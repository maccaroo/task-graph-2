import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TaskGraph } from './TaskGraph'
import * as tasksSvc from '../../services/tasks'
import * as usersSvc from '../../services/users'

vi.mock('../../services/tasks')
vi.mock('../../services/users')

const mockTasks: tasksSvc.Task[] = [
  {
    id: 'task-1',
    title: 'Alpha task',
    description: null,
    assigneeId: null,
    assigneeUsername: null,
    status: 'Incomplete',
    priority: 'High',
    tags: [],
    startType: 'None',
    startDate: null,
    endType: 'Fixed',
    endDate: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    duration: null,
    predecessorIds: [],
    successorIds: ['task-2'],
    predecessors: [],
    successors: [{ relatedTaskId: 'task-2', type: 'Exclusive' }],
  },
  {
    id: 'task-2',
    title: 'Beta task',
    description: null,
    assigneeId: null,
    assigneeUsername: null,
    status: 'Incomplete',
    priority: 'Low',
    tags: [],
    startType: 'None',
    startDate: null,
    endType: 'Fixed',
    endDate: new Date(Date.now() + 20 * 86_400_000).toISOString(),
    duration: null,
    predecessorIds: ['task-1'],
    successorIds: [],
    predecessors: [{ relatedTaskId: 'task-1', type: 'Exclusive' }],
    successors: [],
  },
  {
    id: 'task-open',
    title: 'Open-ended task',
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
    predecessorIds: [],
    successorIds: [],
    predecessors: [],
    successors: [],
  },
]

function renderGraph() {
  return render(
    <MemoryRouter>
      <TaskGraph />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(tasksSvc.getTasks).mockResolvedValue(mockTasks)
  vi.mocked(usersSvc.getUsers).mockResolvedValue([])
})

describe('TaskGraph', () => {
  it('renders loading state initially', () => {
    renderGraph()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders task cards after loading', async () => {
    renderGraph()
    await waitFor(() => {
      expect(screen.getByText('Alpha task')).toBeInTheDocument()
      expect(screen.getByText('Beta task')).toBeInTheDocument()
    })
  })

  it('shows open-ended task in the sidebar panel', async () => {
    renderGraph()
    await waitFor(() => {
      expect(screen.getByText('Open-ended task')).toBeInTheDocument()
    })
  })

  it('renders Add Task button', async () => {
    renderGraph()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()
    })
  })

  it('renders Filters button', async () => {
    renderGraph()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument()
    })
  })

  it('shows error message on load failure', async () => {
    vi.mocked(tasksSvc.getTasks).mockRejectedValue(new Error('network error'))
    renderGraph()
    await waitFor(() => {
      expect(screen.getByText('Failed to load tasks.')).toBeInTheDocument()
    })
  })
})
