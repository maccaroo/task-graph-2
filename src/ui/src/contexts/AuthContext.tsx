import { useState, type ReactNode } from 'react'
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

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isAuthenticated: !!state.token }}>
      {children}
    </AuthContext.Provider>
  )
}
