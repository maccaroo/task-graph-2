import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuthProvider } from '../../contexts/AuthContext'
import { RegisterView } from '../../views/auth/RegisterView'

vi.mock('../../services/auth', () => ({
  register: vi.fn(),
  decodeUserId: vi.fn(() => 'user-456'),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

import { register } from '../../services/auth'
const mockRegister = vi.mocked(register)

function renderRegisterView() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <RegisterView />
      </MemoryRouter>
    </AuthProvider>
  )
}

async function fillForm(overrides: Partial<Record<string, string>> = {}) {
  const fields = {
    'first name': 'Alice',
    'last name': 'Smith',
    username: 'alice',
    email: 'alice@example.com',
    password: 'password123',
    ...overrides,
  }
  for (const [label, value] of Object.entries(fields)) {
    const input = screen.getByLabelText(new RegExp(label, 'i'))
    await userEvent.clear(input)
    await userEvent.type(input, value)
  }
}

describe('RegisterView', () => {
  beforeEach(() => {
    mockRegister.mockReset()
  })

  it('renders all required fields', () => {
    renderRegisterView()
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders link to sign in', () => {
    renderRegisterView()
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows error when first name is empty', async () => {
    renderRegisterView()
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/first name is required/i)
  })

  it('shows error when username contains invalid characters', async () => {
    renderRegisterView()
    await fillForm({ username: 'alice jones' })
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/username may only contain/i)
  })

  it('shows error when email is invalid', async () => {
    renderRegisterView()
    await fillForm({ email: 'not-an-email' })
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i)
  })

  it('shows error when password is too short', async () => {
    renderRegisterView()
    await fillForm({ password: 'short' })
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8/i)
  })

  it('calls register service with correct payload on valid submit', async () => {
    mockRegister.mockResolvedValue({ token: 'test-token' })
    renderRegisterView()
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        firstName: 'Alice',
        lastName: 'Smith',
        username: 'alice',
        email: 'alice@example.com',
        password: 'password123',
      })
    })
  })

  it('shows API error message on failure', async () => {
    mockRegister.mockRejectedValue(new Error('Username already taken.'))
    renderRegisterView()
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/username already taken/i)
  })
})
