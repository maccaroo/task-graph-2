import { api } from '../lib/api'

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  firstName: string
  lastName: string
  email: string
  password: string
}

export async function login(payload: LoginPayload): Promise<{ token: string }> {
  const { data } = await api.post<{ token: string }>('/auth/login', payload)
  return data
}

export async function register(payload: RegisterPayload): Promise<{ token: string }> {
  const { data } = await api.post<{ token: string }>('/auth/register', payload)
  return data
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/auth/password-reset-request', { email })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post('/auth/password-reset', { token, newPassword })
}

/** Decode the `sub` claim (user ID) from a JWT without verifying the signature. */
export function decodeUserId(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub as string
  } catch {
    return ''
  }
}

/** Returns true if the JWT is missing or its `exp` claim is in the past. */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]))
    return typeof exp === 'number' && Date.now() >= exp * 1000
  } catch {
    return true
  }
}
