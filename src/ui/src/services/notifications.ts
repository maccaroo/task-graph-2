import { api } from '../lib/api'

export interface Notification {
  id: string
  type: string
  taskId: string | null
  taskTitle: string | null
  message: string
  isRead: boolean
  createdAt: string
}

export async function getNotifications(): Promise<Notification[]> {
  const { data } = await api.get<Notification[]>('/notifications')
  return data
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.put(`/notifications/${id}/read`)
}
