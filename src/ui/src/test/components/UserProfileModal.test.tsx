import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

import { updateUser, updateAvatar } from '../../services/users'
const mockUpdateUser = vi.mocked(updateUser)
const mockUpdateAvatar = vi.mocked(updateAvatar)

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

  it('calls refresh and closes modal after save', async () => {
    mockUpdateUser.mockResolvedValue(mockUser)
    const onClose = vi.fn()
    render(<MemoryRouter><UserProfileModal open={true} onClose={onClose} /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    expect(onClose).toHaveBeenCalled()
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

// jsdom never fires onLoad for images — simulate it so the crop picker becomes interactive
async function uploadFileAndSimulateLoad(file: File) {
  await userEvent.upload(screen.getByLabelText(/upload avatar/i), file)
  await screen.findByText(/crop & upload/i)
  // Fire load on the preview image so handleImgLoad runs and enables the button
  const preview = screen.getByAltText('Upload preview')
  fireEvent.load(preview)
}

describe('UserProfileModal — avatar upload', () => {
  beforeEach(() => {
    mockUpdateAvatar.mockReset()
    mockRefresh.mockReset()
  })

  it('shows error when file is larger than 10 MB', async () => {
    renderModal()
    const bigFile = new File(['x'.repeat(11 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 })
    const fileInput = screen.getByLabelText(/upload avatar/i)
    await userEvent.upload(fileInput, bigFile)
    expect(await screen.findByRole('alert')).toHaveTextContent(/10 MB/i)
  })

  it('shows the crop picker after picking a valid file', async () => {
    renderModal()
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText(/upload avatar/i), file)
    expect(await screen.findByText(/crop & upload/i)).toBeInTheDocument()
    // Profile form is hidden while crop picker is shown
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
  })

  it('calls updateAvatar and refresh when crop is confirmed, and returns to profile form', async () => {
    mockUpdateAvatar.mockResolvedValue({ ...mockUser, avatarUrl: '/new-avatar.jpg' })
    renderModal()

    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    await uploadFileAndSimulateLoad(file)

    await userEvent.click(screen.getByRole('button', { name: /crop & upload/i }))

    await waitFor(() => expect(mockUpdateAvatar).toHaveBeenCalledWith('user-1', file, undefined))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    // Crop picker dismissed, profile form visible again
    expect(await screen.findByRole('button', { name: /^save$/i })).toBeInTheDocument()
  })

  it('avatar upload refresh does not overwrite unsaved profile form edits', async () => {
    mockUpdateAvatar.mockResolvedValue({ ...mockUser, avatarUrl: '/new-avatar.jpg' })
    renderModal()

    // User edits last name before uploading avatar
    await userEvent.clear(screen.getByLabelText(/last name/i))
    await userEvent.type(screen.getByLabelText(/last name/i), 'Jones')
    expect(screen.getByDisplayValue('Jones')).toBeInTheDocument()

    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    await uploadFileAndSimulateLoad(file)
    await userEvent.click(screen.getByRole('button', { name: /crop & upload/i }))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())

    // Last name should still be the user's edit, not reverted to server value
    expect(screen.getByDisplayValue('Jones')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Smith')).not.toBeInTheDocument()
  })

  it('shows error and dismisses crop picker when upload fails', async () => {
    mockUpdateAvatar.mockRejectedValue(new Error('Upload failed.'))
    renderModal()

    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    await uploadFileAndSimulateLoad(file)

    await userEvent.click(screen.getByRole('button', { name: /crop & upload/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/upload failed/i)
    // Crop picker dismissed after failure
    expect(screen.queryByText(/crop & upload/i)).not.toBeInTheDocument()
  })

  it('cancel button dismisses crop picker and shows profile form', async () => {
    renderModal()
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText(/upload avatar/i), file)
    await screen.findByText(/crop & upload/i)

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(screen.queryByText(/crop & upload/i)).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^save$/i })).toBeInTheDocument()
  })
})
