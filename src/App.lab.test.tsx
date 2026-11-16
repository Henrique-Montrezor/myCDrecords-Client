import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { refreshSession } from './services/api'

vi.mock('./services/api', async (original) => ({ ...(await original<typeof import('./services/api')>()), refreshSession: vi.fn() }))
vi.mock('./pages/RecommendationLabPage', () => ({ default: () => <h1>Laboratório sintético isolado</h1> }))
vi.mock('./components/SessionGate', async () => ({ default: (await import('react-router-dom')).Outlet }))
vi.mock('./components/AppShell', async () => ({ default: (await import('react-router-dom')).Outlet }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(refreshSession).mockResolvedValue({ message: 'Synthetic anonymous test', accessToken: 'synthetic-only', expiresIn: 0 })
})
afterEach(cleanup)

describe('laboratory session boundary', () => {
  it('does not refresh or mount a real session when opening the synthetic laboratory', async () => {
    render(<MemoryRouter initialEntries={['/recommendations/lab']}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Laboratório sintético isolado' })).toBeTruthy()
    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('preserves session initialization for ordinary application routes', async () => {
    render(<MemoryRouter initialEntries={['/unknown-route']}><App /></MemoryRouter>)
    await waitFor(() => expect(refreshSession).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('heading', { name: 'Laboratório sintético isolado' })).toBeNull()
  })
})
