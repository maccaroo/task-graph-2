import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuthProvider } from '../../contexts/AuthContext'
import { LoginView } from '../../views/auth/LoginView'

vi.mock('../../services/auth', () => ({
  login: vi.fn(),
  decodeUserId: vi.fn(() => 'user-123'),
}))

// Suppress navigation errors in tests
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

import { login } from '../../services/auth'
const mockLogin = vi.mocked(login)

function renderLoginView() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <LoginView />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('LoginView', () => {
  beforeEach(() => {
    mockLogin.mockReset()
  })

  it('renders username, password inputs and sign-in button', () => {
    renderLoginView()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders links to register and forgot password', () => {
    renderLoginView()
    expect(screen.getByRole('link', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument()
  })

  it('shows error when username is empty', async () => {
    renderLoginView()
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/username is required/i)
  })

  it('shows error when password is empty', async () => {
    renderLoginView()
    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/password is required/i)
  })

  it('calls login service with credentials on submit', async () => {
    mockLogin.mockResolvedValue({ token: 'test-token' })
    renderLoginView()
    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ username: 'alice', password: 'password123' })
    })
  })

  it('shows API error message on failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials.'))
    renderLoginView()
    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid credentials/i)
  })
})
