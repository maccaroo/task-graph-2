export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  PASSWORD_RESET_REQUEST: '/password-reset-request',
  PASSWORD_RESET: '/password-reset',
  DASHBOARD: '/',
  TASK: (id: string) => `/tasks/${id}`,
} as const
