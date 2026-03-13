import { useState, useEffect, useCallback } from 'react'
import { type Notification, getNotifications } from '../services/notifications'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await getNotifications()
      setNotifications(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const unreadCount = notifications.filter(n => !n.isRead).length

  return { notifications, unreadCount, loading, refresh, setNotifications }
}
