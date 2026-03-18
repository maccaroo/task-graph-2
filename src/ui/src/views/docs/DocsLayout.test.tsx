import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { DocsLayout } from './DocsLayout'
import { ROUTES } from '../../routeConstants'

function renderLayout(initialPath: string = ROUTES.DOCS_ABOUT) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path={ROUTES.DOCS} element={<DocsLayout />}>
          <Route path={ROUTES.DOCS_ABOUT} element={<div>About content</div>} />
          <Route path={ROUTES.DOCS_FAQ}   element={<div>FAQ content</div>} />
          <Route path={ROUTES.DOCS_GUIDE} element={<div>Guide content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('DocsLayout', () => {
  it('renders all sub-nav tabs', () => {
    renderLayout()
    const nav = screen.getByRole('navigation', { name: /documentation sections/i })
    expect(nav).toHaveTextContent('About')
    expect(nav).toHaveTextContent('FAQ')
    expect(nav).toHaveTextContent('User Guide')
  })

  it('renders the outlet content', () => {
    renderLayout(ROUTES.DOCS_ABOUT)
    expect(screen.getByText('About content')).toBeInTheDocument()
  })

  it('renders FAQ content when on FAQ route', () => {
    renderLayout(ROUTES.DOCS_FAQ)
    expect(screen.getByText('FAQ content')).toBeInTheDocument()
  })

  it('renders User Guide content when on guide route', () => {
    renderLayout(ROUTES.DOCS_GUIDE)
    expect(screen.getByText('Guide content')).toBeInTheDocument()
  })

  it('marks the active tab with the active class', () => {
    renderLayout(ROUTES.DOCS_FAQ)
    const faqLink = screen.getByRole('link', { name: 'FAQ' })
    expect(faqLink.className).toMatch(/tabActive/)
  })
})
