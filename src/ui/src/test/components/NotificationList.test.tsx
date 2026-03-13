import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NotificationList } from '../../components/NotificationList/NotificationList'
import { type Notification } from '../../services/notifications'

vi.mock('../../services/notifications', () => ({
  markNotificationRead: vi.fn(),
  getNotifications: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockNavigate = vi.fn()

import { markNotificationRead } from '../../services/notifications'
const mockMark = vi.mocked(markNotificationRead)

const noop = vi.fn()

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: '1',
    type: 'assignment',
    taskId: 'task-1',
    taskTitle: 'Fix the bug',
    message: 'You were assigned to a task',
    isRead: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function renderList(notifications: Notification[], onNotificationsChange = noop) {
  return render(
    <MemoryRouter>
      <NotificationList
        notifications={notifications}
        onClose={noop}
        onNotificationsChange={onNotificationsChange}
      />
    </MemoryRouter>
  )
}

describe('NotificationList', () => {
  beforeEach(() => {
    mockMark.mockReset()
    mockNavigate.mockReset()
    noop.mockReset()
  })

  it('shows empty state when there are no notifications', () => {
    renderList([])
    expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
  })

  it('renders notification type and task title', () => {
    renderList([makeNotification()])
    expect(screen.getByText('assignment')).toBeInTheDocument()
    expect(screen.getByText('Fix the bug')).toBeInTheDocument()
  })

  it('falls back to message when taskTitle is null', () => {
    renderList([makeNotification({ taskTitle: null, message: 'You have a reminder' })])
    expect(screen.getByText('You have a reminder')).toBeInTheDocument()
  })

  it('renders multiple notifications', () => {
    renderList([
      makeNotification({ id: '1', taskTitle: 'Task A' }),
      makeNotification({ id: '2', taskTitle: 'Task B', isRead: true }),
    ])
    expect(screen.getByText('Task A')).toBeInTheDocument()
    expect(screen.getByText('Task B')).toBeInTheDocument()
  })

  it('renders the header title', () => {
    renderList([])
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('clicking an unread notification marks it as read and navigates to the task', async () => {
    mockMark.mockResolvedValue(undefined)
    const onNotificationsChange = vi.fn()
    const notif = makeNotification({ id: 'n1', taskId: 'task-42' })
    renderList([notif], onNotificationsChange)

    await userEvent.click(screen.getByRole('button', { name: /assignment/i }))

    // Optimistic update should be called
    await waitFor(() => {
      expect(onNotificationsChange).toHaveBeenCalledWith([{ ...notif, isRead: true }])
    })
    // API call
    expect(mockMark).toHaveBeenCalledWith('n1')
    // Navigation
    expect(mockNavigate).toHaveBeenCalledWith('/tasks/task-42')
  })

  it('clicking an already-read notification skips markNotificationRead', async () => {
    const notif = makeNotification({ isRead: true, taskId: 'task-7' })
    renderList([notif])

    await userEvent.click(screen.getByRole('button', { name: /assignment/i }))

    expect(mockMark).not.toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/tasks/task-7')
  })

  it('does not navigate when notification has no taskId', async () => {
    mockMark.mockResolvedValue(undefined)
    const notif = makeNotification({ taskId: null })
    renderList([notif])

    await userEvent.click(screen.getByRole('button', { name: /assignment/i }))

    await waitFor(() => expect(mockMark).toHaveBeenCalled())
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('reverts optimistic update when markNotificationRead fails', async () => {
    mockMark.mockRejectedValue(new Error('Network error'))
    const onNotificationsChange = vi.fn()
    const notif = makeNotification()
    renderList([notif], onNotificationsChange)

    await userEvent.click(screen.getByRole('button', { name: /assignment/i }))

    await waitFor(() => expect(onNotificationsChange).toHaveBeenCalledTimes(2))
    // Second call reverts to original list
    expect(onNotificationsChange).toHaveBeenNthCalledWith(2, [notif])
  })
})
