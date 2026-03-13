import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { NotificationList } from '../../components/NotificationList/NotificationList'
import { type Notification } from '../../services/notifications'

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

describe('NotificationList', () => {
  it('shows empty state when there are no notifications', () => {
    render(<NotificationList notifications={[]} onClose={noop} onNotificationsChange={noop} />)
    expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
  })

  it('renders notification type and task title', () => {
    const notif = makeNotification()
    render(<NotificationList notifications={[notif]} onClose={noop} onNotificationsChange={noop} />)
    expect(screen.getByText('assignment')).toBeInTheDocument()
    expect(screen.getByText('Fix the bug')).toBeInTheDocument()
  })

  it('falls back to message when taskTitle is null', () => {
    const notif = makeNotification({ taskTitle: null, message: 'You have a reminder' })
    render(<NotificationList notifications={[notif]} onClose={noop} onNotificationsChange={noop} />)
    expect(screen.getByText('You have a reminder')).toBeInTheDocument()
  })

  it('renders multiple notifications', () => {
    const notifs = [
      makeNotification({ id: '1', taskTitle: 'Task A' }),
      makeNotification({ id: '2', taskTitle: 'Task B', isRead: true }),
    ]
    render(<NotificationList notifications={notifs} onClose={noop} onNotificationsChange={noop} />)
    expect(screen.getByText('Task A')).toBeInTheDocument()
    expect(screen.getByText('Task B')).toBeInTheDocument()
  })

  it('renders the header title', () => {
    render(<NotificationList notifications={[]} onClose={noop} onNotificationsChange={noop} />)
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })
})
