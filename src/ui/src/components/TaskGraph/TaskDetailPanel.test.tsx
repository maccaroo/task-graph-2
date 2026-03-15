import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TaskDetailPanel } from './TaskDetailPanel'
import * as tasksSvc from '../../services/tasks'
import { type UserSummary } from '../../services/users'

vi.mock('../../services/tasks')

const mockUsers: UserSummary[] = [
  { id: 'user-1', username: 'alice', firstName: 'Alice', lastName: 'Smith', avatarUrl: null, completeTasks: 0, incompleteTasks: 1 },
]

const baseTask: tasksSvc.Task = {
  id: 'task-1',
  title: 'My Task',
  description: 'Some description',
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
}

const taskWithRels: tasksSvc.Task = {
  ...baseTask,
  id: 'task-2',
  title: 'Dependent Task',
  predecessorIds: ['task-1'],
  successorIds: ['task-3'],
  predecessors: [{ relatedTaskId: 'task-1', type: 'Exclusive' }],
  successors: [{ relatedTaskId: 'task-3', type: 'HaveCompleted' }],
}

const allTasks: tasksSvc.Task[] = [
  baseTask,
  taskWithRels,
  { ...baseTask, id: 'task-3', title: 'Successor Task', predecessorIds: ['task-2'], successorIds: [], predecessors: [{ relatedTaskId: 'task-2', type: 'HaveCompleted' }], successors: [] },
]

function renderPanel(task: tasksSvc.Task | null, props?: Partial<React.ComponentProps<typeof TaskDetailPanel>>) {
  const defaults = {
    task,
    tasks: allTasks,
    users: mockUsers,
    onClose: vi.fn(),
    onUpdated: vi.fn(),
    onSelectTask: vi.fn(),
    autoSaveDelayMs: 50,
  }
  return render(
    <MemoryRouter>
      <TaskDetailPanel {...defaults} {...props} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(tasksSvc.updateTask).mockResolvedValue(baseTask)
  vi.mocked(tasksSvc.removePredecessor).mockResolvedValue(undefined)
  vi.mocked(tasksSvc.addPredecessor).mockResolvedValue(undefined)
})

describe('TaskDetailPanel', () => {
  it('renders nothing when task is null', () => {
    const { container } = renderPanel(null)
    expect(container.firstChild).toBeNull()
  })

  it('renders task title and description', () => {
    renderPanel(baseTask)
    expect(screen.getByDisplayValue('My Task')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Some description')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    renderPanel(baseTask, { onClose })
    fireEvent.click(screen.getByLabelText('Close detail panel'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows Complete checkbox unchecked for Incomplete task', () => {
    renderPanel(baseTask)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('shows Complete checkbox checked for Complete task', () => {
    renderPanel({ ...baseTask, status: 'Complete' })
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('auto-saves after delay when title is changed', async () => {
    renderPanel(baseTask)
    const titleInput = screen.getByDisplayValue('My Task')
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })
    await waitFor(() => {
      expect(tasksSvc.updateTask).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ title: 'Updated Title' }),
      )
    }, { timeout: 500 })
  })

  it('calls onUpdated after successful save', async () => {
    const onUpdated = vi.fn()
    renderPanel(baseTask, { onUpdated })
    fireEvent.change(screen.getByDisplayValue('My Task'), { target: { value: 'New Title' } })
    await waitFor(() => expect(onUpdated).toHaveBeenCalledOnce(), { timeout: 500 })
  })

  it('shows save error when update fails', async () => {
    vi.mocked(tasksSvc.updateTask).mockRejectedValue(new Error('Server error'))
    renderPanel(baseTask)
    fireEvent.change(screen.getByDisplayValue('My Task'), { target: { value: 'Bad Title' } })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error')
    }, { timeout: 500 })
  })

  it('locks duration when both start and end are Fixed', () => {
    renderPanel({ ...baseTask, startType: 'Fixed', startDate: '2026-01-01T00:00:00', endType: 'Fixed', endDate: '2026-01-10T00:00:00' })
    const durationInput = screen.getByPlaceholderText('hh:mm:ss')
    expect(durationInput).toBeDisabled()
  })

  it('enables duration when timing is not both Fixed', () => {
    renderPanel({ ...baseTask, startType: 'Fixed', startDate: '2026-01-01T00:00:00', endType: 'Flexible' })
    const durationInput = screen.getByPlaceholderText('hh:mm:ss')
    expect(durationInput).not.toBeDisabled()
  })

  it('displays predecessor list with remove button', () => {
    renderPanel(taskWithRels)
    expect(screen.getByText('My Task')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove my task as predecessor/i })).toBeInTheDocument()
  })

  it('calls removePredecessor and onUpdated when remove is clicked', async () => {
    const onUpdated = vi.fn()
    renderPanel(taskWithRels, { onUpdated })
    fireEvent.click(screen.getByRole('button', { name: /remove my task as predecessor/i }))
    await waitFor(() => {
      expect(tasksSvc.removePredecessor).toHaveBeenCalledWith('task-2', 'task-1')
      expect(onUpdated).toHaveBeenCalled()
    })
  })

  it('displays successor list', () => {
    renderPanel(taskWithRels)
    expect(screen.getByText('Successor Task')).toBeInTheDocument()
    expect(screen.getByText('HaveCompleted')).toBeInTheDocument()
  })

  it('calls onSelectTask when predecessor link is clicked', () => {
    const onSelectTask = vi.fn()
    renderPanel(taskWithRels, { onSelectTask })
    fireEvent.click(screen.getByRole('button', { name: 'My Task' }))
    expect(onSelectTask).toHaveBeenCalledWith('task-1')
  })

  it('adds a predecessor via the dropdown', async () => {
    const onUpdated = vi.fn()
    // task-1 has no predecessors; the add predecessor select is the last combobox
    renderPanel(baseTask, { onUpdated, tasks: allTasks })
    const addSelect = screen.getAllByRole('combobox').at(-1)!
    fireEvent.change(addSelect, { target: { value: 'task-2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => {
      expect(tasksSvc.addPredecessor).toHaveBeenCalledWith('task-1', 'task-2')
      expect(onUpdated).toHaveBeenCalled()
    })
  })

  it('shows Saved status when not dirty', () => {
    renderPanel(baseTask)
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('shows Unsaved changes status when dirty', () => {
    renderPanel(baseTask)
    fireEvent.change(screen.getByDisplayValue('My Task'), { target: { value: 'Editing' } })
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
  })

  it('resets form when a different task is selected', () => {
    const { rerender } = renderPanel(baseTask)
    expect(screen.getByDisplayValue('My Task')).toBeInTheDocument()
    rerender(
      <MemoryRouter>
        <TaskDetailPanel
          task={taskWithRels}
          tasks={allTasks}
          users={mockUsers}
          onClose={vi.fn()}
          onUpdated={vi.fn()}
          onSelectTask={vi.fn()}
          autoSaveDelayMs={50}
        />
      </MemoryRouter>,
    )
    expect(screen.getByDisplayValue('Dependent Task')).toBeInTheDocument()
  })
})
