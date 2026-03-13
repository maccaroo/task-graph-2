import { useNavigate } from 'react-router-dom'
import { type Notification, markNotificationRead } from '../../services/notifications'
import { ROUTES } from '../../routeConstants'
import styles from './NotificationList.module.css'

interface NotificationListProps {
  notifications: Notification[]
  onClose: () => void
  onNotificationsChange: (notifications: Notification[]) => void
}

export function NotificationList({ notifications, onClose, onNotificationsChange }: NotificationListProps) {
  const navigate = useNavigate()

  async function handleClick(n: Notification) {
    onClose()

    // Optimistic mark-as-read
    if (!n.isRead) {
      const updated = notifications.map(x => x.id === n.id ? { ...x, isRead: true } : x)
      onNotificationsChange(updated)
      try {
        await markNotificationRead(n.id)
      } catch {
        onNotificationsChange(notifications) // revert on failure
      }
    }

    if (n.taskId) navigate(ROUTES.TASK(n.taskId))
  }

  return (
    <div className={styles.panel} role="dialog" aria-label="Notifications">
      <div className={styles.header}>
        <span className={styles.title}>Notifications</span>
      </div>

      {notifications.length === 0 ? (
        <p className={styles.empty}>No notifications</p>
      ) : (
        <ul className={styles.list}>
          {notifications.map(n => (
            <li
              key={n.id}
              className={[styles.item, n.isRead ? styles.read : styles.unread].join(' ')}
            >
              <button
                className={styles.itemBtn}
                onClick={() => handleClick(n)}
                aria-label={`${n.type}: ${n.taskTitle ?? n.message}`}
              >
                <span className={styles.type}>{n.type}</span>
                <span className={styles.taskTitle}>
                  {n.taskTitle ?? n.message}
                </span>
                <span className={styles.timestamp}>{formatTimestamp(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatTimestamp(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffM = Math.floor(diffMs / 60_000)
  if (diffM < 1) return 'Just now'
  if (diffM < 60) return `${diffM}m ago`
  const diffH = Math.floor(diffM / 60)
  if (diffH < 24) return `${diffH}h ago`
  return new Date(iso).toLocaleDateString()
}
