import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NotificationList } from '../../components/NotificationList/NotificationList'
import { type Notification } from '../../services/notifications'

vi.mock('../../services/notifications', () => ({
  markNotificationRead: vi.fn(),
  getNotifications: vi.fn(),
  clearReadNotifications: vi.fn(),
}))

import { markNotificationRead, clearReadNotifications } from '../../services/notifications'
const mockMark = vi.mocked(markNotificationRead)
const mockClearRead = vi.mocked(clearReadNotifications)

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

function renderList(notifications: Notification[], onNotificationsChange = noop, onTaskSelect = noop) {
  return render(
    <MemoryRouter>
      <NotificationList
        notifications={notifications}
        onNotificationsChange={onNotificationsChange}
        onTaskSelect={onTaskSelect}
      />
    </MemoryRouter>
  )
}

describe('NotificationList', () => {
  beforeEach(() => {
    mockMark.mockReset()
    mockClearRead.mockReset()
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

  it('clicking an unread notification marks it as read and calls onTaskSelect', async () => {
    mockMark.mockResolvedValue(undefined)
    const onNotificationsChange = vi.fn()
    const onTaskSelect = vi.fn()
    const notif = makeNotification({ id: 'n1', taskId: 'task-42' })
    renderList([notif], onNotificationsChange, onTaskSelect)

    await userEvent.click(screen.getByRole('button', { name: /assignment/i }))

    await waitFor(() => {
      expect(onNotificationsChange).toHaveBeenCalledWith([{ ...notif, isRead: true }])
    })
    expect(mockMark).toHaveBeenCalledWith('n1')
    expect(onTaskSelect).toHaveBeenCalledWith('task-42')
  })

  it('clicking an already-read notification skips markNotificationRead but still calls onTaskSelect', async () => {
    const onTaskSelect = vi.fn()
    const notif = makeNotification({ isRead: true, taskId: 'task-7' })
    renderList([notif], noop, onTaskSelect)

    await userEvent.click(screen.getByRole('button', { name: /assignment/i }))

    expect(mockMark).not.toHaveBeenCalled()
    expect(onTaskSelect).toHaveBeenCalledWith('task-7')
  })

  it('does not call onTaskSelect when notification has no taskId', async () => {
    mockMark.mockResolvedValue(undefined)
    const onTaskSelect = vi.fn()
    const notif = makeNotification({ taskId: null })
    renderList([notif], noop, onTaskSelect)

    await userEvent.click(screen.getByRole('button', { name: /assignment/i }))

    await waitFor(() => expect(mockMark).toHaveBeenCalled())
    expect(onTaskSelect).not.toHaveBeenCalled()
  })

  it('does not show Clear Read button when no notifications are read', () => {
    renderList([makeNotification({ isRead: false })])
    expect(screen.queryByRole('button', { name: /clear read/i })).not.toBeInTheDocument()
  })

  it('shows Clear Read button when at least one notification is read', () => {
    renderList([makeNotification({ isRead: true })])
    expect(screen.getByRole('button', { name: /clear read/i })).toBeInTheDocument()
  })

  it('Clear Read removes read notifications optimistically and calls clearReadNotifications', async () => {
    mockClearRead.mockResolvedValue(undefined)
    const onNotificationsChange = vi.fn()
    const unread = makeNotification({ id: '1', isRead: false })
    const read = makeNotification({ id: '2', isRead: true, taskTitle: 'Done task' })
    renderList([unread, read], onNotificationsChange)

    await userEvent.click(screen.getByRole('button', { name: /clear read/i }))

    await waitFor(() => {
      expect(onNotificationsChange).toHaveBeenCalledWith([unread])
    })
    expect(mockClearRead).toHaveBeenCalled()
  })

  it('reverts Clear Read optimistic update when clearReadNotifications fails', async () => {
    mockClearRead.mockRejectedValue(new Error('Network error'))
    const onNotificationsChange = vi.fn()
    const notifications = [
      makeNotification({ id: '1', isRead: false }),
      makeNotification({ id: '2', isRead: true }),
    ]
    renderList(notifications, onNotificationsChange)

    await userEvent.click(screen.getByRole('button', { name: /clear read/i }))

    await waitFor(() => expect(onNotificationsChange).toHaveBeenCalledTimes(2))
    expect(onNotificationsChange).toHaveBeenNthCalledWith(2, notifications)
  })

  it('reverts optimistic update when markNotificationRead fails', async () => {
    mockMark.mockRejectedValue(new Error('Network error'))
    const onNotificationsChange = vi.fn()
    const notif = makeNotification()
    renderList([notif], onNotificationsChange)

    await userEvent.click(screen.getByRole('button', { name: /assignment/i }))

    await waitFor(() => expect(onNotificationsChange).toHaveBeenCalledTimes(2))
    expect(onNotificationsChange).toHaveBeenNthCalledWith(2, [notif])
  })
})
