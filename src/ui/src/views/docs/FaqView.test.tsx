import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { FaqView } from './FaqView'

function renderView() {
  return render(
    <MemoryRouter>
      <FaqView />
    </MemoryRouter>
  )
}

describe('FaqView', () => {
  it('renders all category titles', () => {
    renderView()
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.getByText('Dependencies')).toBeInTheDocument()
    expect(screen.getByText('Graph View')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('renders question buttons', () => {
    renderView()
    expect(screen.getByRole('button', { name: /what is taskgraph/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /how do i create a task/i })).toBeInTheDocument()
  })

  it('answers are hidden by default', () => {
    renderView()
    expect(screen.queryByText(/task tracking application for visualising/i)).not.toBeInTheDocument()
  })

  it('expands an answer when the question is clicked', () => {
    renderView()
    const btn = screen.getByRole('button', { name: /what is taskgraph/i })
    fireEvent.click(btn)
    expect(screen.getByText(/task tracking application that visualises/i)).toBeInTheDocument()
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  it('collapses an open answer when clicked again', () => {
    renderView()
    const btn = screen.getByRole('button', { name: /what is taskgraph/i })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.queryByText(/task tracking application for visualising/i)).not.toBeInTheDocument()
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('can expand multiple answers independently', () => {
    renderView()
    const q1 = screen.getByRole('button', { name: /what is taskgraph/i })
    const q2 = screen.getByRole('button', { name: /who is taskgraph for/i })
    fireEvent.click(q1)
    fireEvent.click(q2)
    expect(screen.getByText(/task tracking application that visualises/i)).toBeInTheDocument()
    expect(screen.getByText(/teams and individuals/i)).toBeInTheDocument()
  })
})
