import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PasswordResetView } from '../../views/auth/PasswordResetView'

vi.mock('../../services/auth', () => ({
  resetPassword: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

import { resetPassword } from '../../services/auth'
const mockReset = vi.mocked(resetPassword)

function renderView(token = 'valid-token-guid') {
  return render(
    <MemoryRouter initialEntries={[`/password-reset?token=${token}`]}>
      <PasswordResetView />
    </MemoryRouter>
  )
}

describe('PasswordResetView', () => {
  beforeEach(() => {
    mockReset.mockReset()
  })

  it('renders new password and confirm password inputs', () => {
    renderView()
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })

  it('shows invalid link message when no token in URL', () => {
    render(
      <MemoryRouter initialEntries={['/password-reset']}>
        <PasswordResetView />
      </MemoryRouter>
    )
    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /request a new link/i })).toBeInTheDocument()
  })

  it('shows error when password is empty', async () => {
    renderView()
    await userEvent.click(screen.getByRole('button', { name: /set new password/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/password is required/i)
  })

  it('shows error when password is shorter than 8 characters', async () => {
    renderView()
    await userEvent.type(screen.getByLabelText(/new password/i), 'short')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'short')
    await userEvent.click(screen.getByRole('button', { name: /set new password/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8/i)
  })

  it('shows error when passwords do not match', async () => {
    renderView()
    await userEvent.type(screen.getByLabelText(/new password/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different123')
    await userEvent.click(screen.getByRole('button', { name: /set new password/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/i)
  })

  it('calls resetPassword with token and new password on valid submit', async () => {
    mockReset.mockResolvedValue(undefined)
    renderView('my-reset-token')
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpassword1')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpassword1')
    await userEvent.click(screen.getByRole('button', { name: /set new password/i }))
    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith('my-reset-token', 'newpassword1')
    })
  })

  it('shows API error message on failure', async () => {
    mockReset.mockRejectedValue(new Error('Token has expired.'))
    renderView()
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpassword1')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpassword1')
    await userEvent.click(screen.getByRole('button', { name: /set new password/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/token has expired/i)
  })
})
