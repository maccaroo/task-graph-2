import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { UserProfileModal } from '../../components/UserProfileModal/UserProfileModal'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ userId: 'user-1', token: 'tok', isAuthenticated: true, login: vi.fn(), logout: vi.fn() }),
}))

const mockUser = {
  id: 'user-1',
  username: 'alice',
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
  avatarUrl: null,
}

const mockRefresh = vi.fn()

vi.mock('../../hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: mockUser, loading: false, refresh: mockRefresh }),
}))

vi.mock('../../services/users', () => ({
  updateUser: vi.fn(),
  updateAvatar: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

import { updateUser } from '../../services/users'
const mockUpdateUser = vi.mocked(updateUser)

function renderModal(open = true) {
  return render(
    <MemoryRouter>
      <UserProfileModal open={open} onClose={vi.fn()} />
    </MemoryRouter>
  )
}

describe('UserProfileModal', () => {
  beforeEach(() => {
    mockUpdateUser.mockReset()
    mockRefresh.mockReset()
  })

  it('renders username as read-only', () => {
    renderModal()
    const usernameInput = screen.getByDisplayValue('alice')
    expect(usernameInput).toHaveAttribute('readonly')
  })

  it('populates first name, last name and email from user', () => {
    renderModal()
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Smith')).toBeInTheDocument()
    expect(screen.getByDisplayValue('alice@example.com')).toBeInTheDocument()
  })

  it('renders avatar initials fallback', () => {
    renderModal()
    expect(screen.getByText('AS')).toBeInTheDocument()
  })

  it('renders Save and Reset password buttons', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument()
  })

  it('shows validation error when first name is cleared', async () => {
    renderModal()
    await userEvent.clear(screen.getByLabelText(/first name/i))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/first name is required/i)
  })

  it('shows validation error for invalid email', async () => {
    renderModal()
    await userEvent.clear(screen.getByLabelText(/email/i))
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i)
  })

  it('calls updateUser with correct payload on save', async () => {
    mockUpdateUser.mockResolvedValue({ ...mockUser, firstName: 'Alice' })
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith('user-1', {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
      })
    })
  })

  it('shows success message and calls refresh after save', async () => {
    mockUpdateUser.mockResolvedValue(mockUser)
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/profile saved/i)
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('shows API error on save failure', async () => {
    mockUpdateUser.mockRejectedValue(new Error('Email already registered.'))
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/email already registered/i)
  })

  it('does not render when closed', () => {
    renderModal(false)
    expect(screen.queryByText('User Profile')).not.toBeInTheDocument()
  })
})

describe('UserProfileModal — avatar upload', () => {
  it('shows error when file is larger than 10 MB', async () => {
    renderModal()
    const bigFile = new File(['x'.repeat(11 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 })
    const fileInput = screen.getByLabelText(/upload avatar/i)
    await userEvent.upload(fileInput, bigFile)
    expect(await screen.findByRole('alert')).toHaveTextContent(/10 MB/i)
  })
})
