import { useCallback, useEffect, useState } from 'react'
import { wsClient } from '../lib/websocket'
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

  // Real-time: prepend incoming notifications pushed by the server
  useEffect(() => {
    wsClient.connect()

    function onNotification(data: unknown) {
      setNotifications(prev => [data as Notification, ...prev])
    }

    wsClient.on('notification', onNotification)
    return () => wsClient.off('notification', onNotification)
  }, [])

  const unreadCount = notifications.filter(n => !n.isRead).length

  return { notifications, unreadCount, loading, refresh, setNotifications }
}
