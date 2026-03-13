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
  // Pass undefined Content-Type so Axios sets the multipart boundary automatically
  const { data } = await api.put<User>(`/users/${id}/avatar`, form, {
    headers: { 'Content-Type': undefined },
  })
  return data
}
