import { createContext } from 'react'
import type { User } from '../services/users'

export interface CurrentUserContextValue {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
}

export const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)
