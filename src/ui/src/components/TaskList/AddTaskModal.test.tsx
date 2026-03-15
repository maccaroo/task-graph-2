import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AddTaskModal } from './AddTaskModal'
import * as tasksSvc from '../../services/tasks'
import * as usersSvc from '../../services/users'

vi.mock('../../services/tasks')
vi.mock('../../services/users')

const onClose = vi.fn()
const onCreated = vi.fn()

function renderModal(open = true) {
  return render(
    <AddTaskModal open={open} onClose={onClose} onCreated={onCreated} />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(usersSvc.getUsers).mockResolvedValue([])
  vi.mocked(tasksSvc.createTask).mockResolvedValue({
    id: 'new-task',
    title: 'New Task',
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
  })
})

describe('AddTaskModal', () => {
  it('renders when open', () => {
    renderModal()
    expect(screen.getByRole('dialog', { name: /add task/i })).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderModal(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows validation error when title is empty', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))
    expect(await screen.findByText(/title is required/i)).toBeInTheDocument()
    expect(tasksSvc.createTask).not.toHaveBeenCalled()
  })

  it('calls createTask with correct data and closes on success', async () => {
    renderModal()
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'My New Task' } })
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))

    await waitFor(() => {
      expect(tasksSvc.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'My New Task', priority: 'Medium' })
      )
      expect(onCreated).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows error when createTask fails', async () => {
    vi.mocked(tasksSvc.createTask).mockRejectedValue(new Error('Server error'))
    renderModal()
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Bad Task' } })
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('parses comma-separated tags', async () => {
    renderModal()
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Tagged Task' } })
    fireEvent.change(screen.getByLabelText(/tags/i), { target: { value: 'alpha, beta, gamma' } })
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))

    await waitFor(() => {
      expect(tasksSvc.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['alpha', 'beta', 'gamma'] })
      )
    })
  })
})
