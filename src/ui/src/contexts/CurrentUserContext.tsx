import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { type User, getUser } from '../services/users'
import { useAuth } from '../hooks/useAuth'
import { CurrentUserContext } from './currentUserContextDef'

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  // Start as loading only when there is a userId to fetch; avoids synchronous setState in effect
  const [loading, setLoading] = useState(() => !!userId)
  // Incremented on every refresh so avatar <img> src cache-busting works
  const [avatarVersion, setAvatarVersion] = useState(0)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      setUser(await getUser(userId))
      setAvatarVersion(v => v + 1)
    } catch {
      // silently fail — auth guard will redirect if session is truly invalid
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) { setUser(null); return }
    refresh()
  }, [refresh, userId])

  return (
    <CurrentUserContext.Provider value={{ user, loading, avatarVersion, refresh }}>
      {children}
    </CurrentUserContext.Provider>
  )
}
