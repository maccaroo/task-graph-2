import { useState, useEffect } from 'react'
import { type User, getUser } from '../services/users'
import { useAuth } from './useAuth'

export function useCurrentUser() {
  const { userId } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    getUser(userId)
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  return { user, loading }
}
