import { type Notification, clearReadNotifications, markNotificationRead } from '../../services/notifications'
import styles from './NotificationList.module.css'

interface NotificationListProps {
  notifications: Notification[]
  onNotificationsChange: (notifications: Notification[]) => void
  onTaskSelect?: (taskId: string) => void
}

export function NotificationList({ notifications, onNotificationsChange, onTaskSelect }: NotificationListProps) {
  const hasRead = notifications.some(n => n.isRead)

  async function handleClearRead() {
    const remaining = notifications.filter(n => !n.isRead)
    onNotificationsChange(remaining)
    try {
      await clearReadNotifications()
    } catch {
      onNotificationsChange(notifications) // revert on failure
    }
  }

  async function handleClick(n: Notification) {
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

    if (n.taskId) onTaskSelect?.(n.taskId)
  }

  return (
    <div className={styles.panel} role="dialog" aria-label="Notifications">
      <div className={styles.header}>
        <span className={styles.title}>Notifications</span>
        {hasRead && (
          <button className={styles.clearBtn} onClick={handleClearRead}>
            Clear read
          </button>
        )}
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
