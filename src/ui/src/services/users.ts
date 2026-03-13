import { api } from '../lib/api'

export interface User {
  id: string
  username: string
  firstName: string
  lastName: string
  email: string
  avatarUrl: string | null
}

export interface AvatarCrop {
  x: number
  y: number
  width: number
  height: number
}

export interface UserSummary {
  id: string
  username: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  completeTasks: number
  incompleteTasks: number
}

export async function getUsers(): Promise<UserSummary[]> {
  const { data } = await api.get<UserSummary[]>('/users')
  return data
}

export async function getUser(id: string): Promise<User> {
  const { data } = await api.get<User>(`/users/${id}`)
  return data
}

export async function updateUser(
  id: string,
  payload: { firstName: string; lastName: string; email: string }
): Promise<User> {
  const { data } = await api.put<User>(`/users/${id}`, payload)
  return data
}

export async function updateAvatar(id: string, file: File, crop?: AvatarCrop): Promise<User> {
  const form = new FormData()
  form.append('file', file)
  if (crop) {
    form.append('cropX', String(crop.x))
    form.append('cropY', String(crop.y))
    form.append('cropWidth', String(crop.width))
    form.append('cropHeight', String(crop.height))
  }
  // Use fetch instead of Axios so the browser sets the correct multipart/form-data
  // Content-Type with boundary — Axios's instance default (application/json) would
  // override any attempt to clear it and break multipart parsing on the server.
  const token = localStorage.getItem('auth_token')
  const res = await fetch(`/api/users/${id}/avatar`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string; message?: string }
    throw new Error(body.error ?? body.message ?? 'An unexpected error occurred.')
  }
  return res.json() as Promise<User>
}
