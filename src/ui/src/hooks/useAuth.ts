import { useContext } from 'react'
import { AuthContext } from '../contexts/authContextDef'
import type { AuthContextValue } from '../contexts/authContextDef'

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
