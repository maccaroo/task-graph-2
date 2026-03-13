import { api } from '../lib/api'

export interface User {
  id: string
  username: string
  firstName: string
  lastName: string
  email: string
  avatarUrl: string | null
}

export async function getUser(id: string): Promise<User> {
  const { data } = await api.get<User>(`/users/${id}`)
  return data
}
