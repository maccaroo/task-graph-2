import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PasswordResetRequestView } from '../../views/auth/PasswordResetRequestView'

vi.mock('../../services/auth', () => ({
  requestPasswordReset: vi.fn(),
}))

import { requestPasswordReset } from '../../services/auth'
const mockRequest = vi.mocked(requestPasswordReset)

function renderView() {
  return render(
    <MemoryRouter>
      <PasswordResetRequestView />
    </MemoryRouter>
  )
}

describe('PasswordResetRequestView', () => {
  beforeEach(() => {
    mockRequest.mockReset()
  })

  it('renders email input and submit button', () => {
    renderView()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  it('renders link back to sign in', () => {
    renderView()
    expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument()
  })

  it('shows error when email is empty', async () => {
    renderView()
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/email is required/i)
  })

  it('calls requestPasswordReset with email on submit', async () => {
    mockRequest.mockResolvedValue(undefined)
    renderView()
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith('alice@example.com')
    })
  })

  it('shows success message after submission', async () => {
    mockRequest.mockResolvedValue(undefined)
    renderView()
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })

  it('shows API error message on failure', async () => {
    mockRequest.mockRejectedValue(new Error('User not found.'))
    renderView()
    await userEvent.type(screen.getByLabelText(/email/i), 'unknown@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/user not found/i)
  })
})
