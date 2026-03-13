import axios from 'axios'

const TOKEN_KEY = 'auth_token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Inject JWT on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Normalise error responses
api.interceptors.response.use(
  res => res,
  err => {
    const message: string =
      err.response?.data?.error ??
      err.response?.data?.message ??
      err.message ??
      'An unexpected error occurred.'
    return Promise.reject(new Error(message))
  }
)
