import { type Notification } from '../../services/notifications'
import styles from './NotificationList.module.css'

interface NotificationListProps {
  notifications: Notification[]
  onClose: () => void
  /** Called by P11 when a notification is marked read, to sync state up to Statusbar */
  onNotificationsChange: (notifications: Notification[]) => void
}

export function NotificationList({ notifications }: NotificationListProps) {
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
              <span className={styles.type}>{n.type}</span>
              <span className={styles.taskTitle}>
                {n.taskTitle ?? n.message}
              </span>
              <span className={styles.timestamp}>{formatTimestamp(n.createdAt)}</span>
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
