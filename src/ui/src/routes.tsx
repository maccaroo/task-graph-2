import { createBrowserRouter } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import { Placeholder } from './components/Placeholder'
import { AppShell } from './layouts/AppShell'
import { ROUTES } from './routeConstants'
import { LoginView } from './views/auth/LoginView'
import { PasswordResetRequestView } from './views/auth/PasswordResetRequestView'
import { PasswordResetView } from './views/auth/PasswordResetView'
import { RegisterView } from './views/auth/RegisterView'
import { DashboardView } from './views/DashboardView'
import { UserManagementView } from './views/users/UserManagementView'

export const router = createBrowserRouter([
  // Public routes
  { path: ROUTES.LOGIN, element: <LoginView /> },
  { path: ROUTES.REGISTER, element: <RegisterView /> },
  { path: ROUTES.PASSWORD_RESET_REQUEST, element: <PasswordResetRequestView /> },
  { path: ROUTES.PASSWORD_RESET, element: <PasswordResetView /> },

  // Protected routes — wrapped in AuthGuard + AppShell (Statusbar)
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: ROUTES.DASHBOARD,   element: <DashboardView /> },
          { path: ROUTES.USERS,       element: <UserManagementView /> },
          { path: ROUTES.TASK(':id'), element: <Placeholder name="Task Detail" /> },
        ],
      },
    ],
  },
])
