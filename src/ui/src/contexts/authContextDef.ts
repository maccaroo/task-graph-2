import { createContext } from 'react'

export interface AuthContextValue {
  token: string | null
  userId: string | null
  login: (token: string, userId: string) => void
  logout: () => void
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
