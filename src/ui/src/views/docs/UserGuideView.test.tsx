import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { UserGuideView } from './UserGuideView'

function renderView() {
  return render(
    <MemoryRouter>
      <UserGuideView />
    </MemoryRouter>
  )
}

describe('UserGuideView', () => {
  it('renders all section titles in the sidebar', () => {
    renderView()
    const nav = screen.getByRole('navigation', { name: /guide sections/i })
    expect(nav).toHaveTextContent('Getting Started')
    expect(nav).toHaveTextContent('Managing Tasks')
    expect(nav).toHaveTextContent('Graph View')
    expect(nav).toHaveTextContent('Dependencies')
    expect(nav).toHaveTextContent('Notifications')
    expect(nav).toHaveTextContent('User Profile & Settings')
  })

  it('renders section content in the main area', () => {
    renderView()
    expect(screen.getByText(/logging in \/ registering/i)).toBeInTheDocument()
    expect(screen.getByText(/creating a task/i)).toBeInTheDocument()
    expect(screen.getByText(/relationship types explained/i)).toBeInTheDocument()
  })

  it('renders screenshot placeholders where applicable', () => {
    renderView()
    const placeholders = screen.getAllByText(/screenshot coming soon/i)
    expect(placeholders.length).toBeGreaterThan(0)
  })

  it('renders sidebar navigation buttons', () => {
    renderView()
    expect(screen.getByRole('button', { name: 'Getting Started' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Managing Tasks' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Graph View' })).toBeInTheDocument()
  })
})
