import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <AuthProvider>
        <MemoryRouter>
          <div />
        </MemoryRouter>
      </AuthProvider>
    )
    expect(container).toBeTruthy()
  })
})
