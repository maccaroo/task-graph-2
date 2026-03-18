import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { AboutView } from './AboutView'

function renderView() {
  return render(
    <MemoryRouter>
      <AboutView />
    </MemoryRouter>
  )
}

describe('AboutView', () => {
  it('displays the application name', () => {
    renderView()
    expect(screen.getByText('TaskGraph')).toBeInTheDocument()
  })

  it('displays key feature highlights', () => {
    renderView()
    expect(screen.getByText(/graph and list views for tasks/i)).toBeInTheDocument()
    expect(screen.getByText(/dependency relationships/i)).toBeInTheDocument()
    expect(screen.getByText(/real-time notifications/i)).toBeInTheDocument()
  })

  it('displays technology stack', () => {
    renderView()
    expect(screen.getByText(/react \+ typescript \+ vite/i)).toBeInTheDocument()
    expect(screen.getByText(/\.net \/ asp\.net core/i)).toBeInTheDocument()
    expect(screen.getByText(/postgresql/i)).toBeInTheDocument()
    expect(screen.getByText(/websockets/i)).toBeInTheDocument()
  })

  it('renders the GitHub link', () => {
    renderView()
    const link = screen.getByRole('link', { name: /view on github/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
