import { useEffect, useState, type ReactNode } from 'react'
import { isTokenExpired } from '../services/auth'
import { AuthContext } from './authContextDef'

interface AuthState {
  token: string | null
  userId: string | null
}

const TOKEN_KEY = 'auth_token'
const USER_ID_KEY = 'auth_user_id'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: localStorage.getItem(TOKEN_KEY),
    userId: localStorage.getItem(USER_ID_KEY),
  })

  function login(token: string, userId: string) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_ID_KEY, userId)
    setState({ token, userId })
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_ID_KEY)
    setState({ token: null, userId: null })
  }

  // Log out when the API signals a 401 (token rejected by server)
  // or when the user returns to the tab and the token has since expired.
  useEffect(() => {
    function handleUnauthorized() { logout() }
    function handleVisibility() {
      if (!document.hidden && isTokenExpired(localStorage.getItem(TOKEN_KEY))) logout()
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  // logout is stable (defined inside component, no deps) — omit from deps to avoid re-registering
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isAuthenticated: !!state.token }}>
      {children}
    </AuthContext.Provider>
  )
}
