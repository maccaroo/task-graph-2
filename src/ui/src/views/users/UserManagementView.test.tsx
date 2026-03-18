import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserManagementView } from './UserManagementView'
import * as usersSvc from '../../services/users'
import type { UserSummary } from '../../services/users'

vi.mock('../../services/users')

const mockUsers: UserSummary[] = [
  { id: 'u1', username: 'charlie', firstName: 'Charlie', lastName: 'Brown',  avatarUrl: null, taskCounts: { total: 5, complete: 3, incomplete: 2 } },
  { id: 'u2', username: 'alice',   firstName: 'Alice',   lastName: 'Smith',  avatarUrl: null, taskCounts: { total: 6, complete: 5, incomplete: 1 } },
  { id: 'u3', username: 'bob',     firstName: 'Bob',     lastName: 'Jones',  avatarUrl: 'http://example.com/bob.jpg', taskCounts: { total: 4, complete: 0, incomplete: 4 } },
]

function renderView() {
  return render(
    <MemoryRouter>
      <UserManagementView />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.mocked(usersSvc.getUsers).mockResolvedValue(mockUsers)
})

describe('UserManagementView', () => {
  it('renders the heading', async () => {
    renderView()
    await waitFor(() => expect(screen.getByText('Users')).toBeInTheDocument())
  })

  it('renders a row for each user', async () => {
    renderView()
    await waitFor(() => {
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument()
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Jones')).toBeInTheDocument()
    })
  })

  it('displays task counts correctly', async () => {
    renderView()
    await screen.findByText('Charlie Brown')
    // Charlie: 2 incomplete, 3 complete, 5 total
    const rows = screen.getAllByRole('row')
    const charlieRow = rows.find(r => r.textContent?.includes('Charlie Brown'))!
    expect(charlieRow).toHaveTextContent('2')
    expect(charlieRow).toHaveTextContent('3')
    expect(charlieRow).toHaveTextContent('5')
  })

  it('shows initials fallback when no avatar', async () => {
    renderView()
    await screen.findByText('Charlie Brown')
    // Charlie Brown → "CB"
    expect(screen.getByText('CB')).toBeInTheDocument()
  })

  it('shows avatar image when avatarUrl is set', async () => {
    renderView()
    await screen.findByText('Bob Jones')
    const img = screen.getByAltText('Bob Jones')
    expect(img).toHaveAttribute('src', 'http://example.com/bob.jpg')
  })

  it('sorts by name ascending by default', async () => {
    renderView()
    await screen.findByText('Alice Smith')
    const rows = screen.getAllByRole('row').slice(1) // skip header
    expect(rows[0]).toHaveTextContent('Alice Smith')
    expect(rows[1]).toHaveTextContent('Bob Jones')
    expect(rows[2]).toHaveTextContent('Charlie Brown')
  })

  it('toggles sort direction when same column header clicked', async () => {
    renderView()
    await screen.findByText('Alice Smith')
    // Already sorted asc — click Name to go desc
    fireEvent.click(screen.getByRole('button', { name: 'Name' }))
    await waitFor(() => {
      const rows = screen.getAllByRole('row').slice(1)
      expect(rows[0]).toHaveTextContent('Charlie Brown')
      expect(rows[2]).toHaveTextContent('Alice Smith')
    })
  })

  it('sorts by username when username header clicked', async () => {
    renderView()
    const usernameHeader = await screen.findByRole('button', { name: /username/i })
    fireEvent.click(usernameHeader)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('alice')
    expect(rows[1]).toHaveTextContent('bob')
    expect(rows[2]).toHaveTextContent('charlie')
  })

  it('sorts by total tasks descending after two clicks', async () => {
    renderView()
    // First click: switch sort column to Total (asc)
    fireEvent.click(await screen.findByRole('button', { name: 'Total' }))
    await waitFor(() => {
      const rows = screen.getAllByRole('row').slice(1)
      expect(rows[0]).toHaveTextContent('Bob Jones') // 4 total — confirm asc applied
    })
    // Re-query because SortHeader remounts on each render
    fireEvent.click(screen.getByRole('button', { name: 'Total' }))
    await waitFor(() => {
      const rows = screen.getAllByRole('row').slice(1)
      // Alice: 6 total, Charlie: 5, Bob: 4
      expect(rows[0]).toHaveTextContent('Alice Smith')
      expect(rows[1]).toHaveTextContent('Charlie Brown')
      expect(rows[2]).toHaveTextContent('Bob Jones')
    })
  })

  it('shows empty state when no users', async () => {
    vi.mocked(usersSvc.getUsers).mockResolvedValue([])
    renderView()
    await waitFor(() => expect(screen.getByText(/no users found/i)).toBeInTheDocument())
  })

  it('shows error state when API fails', async () => {
    vi.mocked(usersSvc.getUsers).mockRejectedValue(new Error('Network error'))
    renderView()
    await waitFor(() => expect(screen.getByText(/failed to load users/i)).toBeInTheDocument())
  })
})
