import { createBrowserRouter } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import { ROUTES } from './routeConstants'
import { LoginView } from './views/auth/LoginView'
import { PasswordResetRequestView } from './views/auth/PasswordResetRequestView'
import { PasswordResetView } from './views/auth/PasswordResetView'
import { RegisterView } from './views/auth/RegisterView'

// Placeholder views — replaced in subsequent phases
function Placeholder({ name }: { name: string }) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', color: 'var(--color-text)' }}>
      <h1>{name}</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>Coming soon</p>
    </div>
  )
}

export const router = createBrowserRouter([
  // Public routes
  { path: ROUTES.LOGIN, element: <LoginView /> },
  { path: ROUTES.REGISTER, element: <RegisterView /> },
  { path: ROUTES.PASSWORD_RESET_REQUEST, element: <PasswordResetRequestView /> },
  { path: ROUTES.PASSWORD_RESET, element: <PasswordResetView /> },

  // Protected routes
  {
    element: <AuthGuard />,
    children: [
      { path: ROUTES.DASHBOARD, element: <Placeholder name="Dashboard" /> },
    ],
  },
])
