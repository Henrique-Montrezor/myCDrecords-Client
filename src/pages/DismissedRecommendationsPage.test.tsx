import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../services/api'
import type { DismissedRecommendationsPage as Page } from '../types/api'
import DismissedRecommendationsPage from './DismissedRecommendationsPage'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  getDismissedRecommendations: vi.fn(),
  undoDismissRecommendation: vi.fn(),
}))

const dismissed: Page = {
  albums: [{ id: 'album-1', title: 'In the Flat Field', artist: 'Bauhaus', year: '1980', cover: '', link: '/albums/album-1', reasons: [] }],
  total: 1,
  nextOffset: null,
}

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.getDismissedRecommendations).mockResolvedValue(dismissed)
  vi.mocked(api.undoDismissRecommendation).mockResolvedValue(undefined)
})

const renderPage = () => render(<MemoryRouter><DismissedRecommendationsPage /></MemoryRouter>)

describe('DismissedRecommendationsPage', () => {
  it('restores a dismissed album and removes it from the list', async () => {
    renderPage()
    expect(await screen.findByRole('link', { name: 'In the Flat Field' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Voltar às sugestões: In the Flat Field' }))
    expect(api.undoDismissRecommendation).toHaveBeenCalledWith('album-1')
    expect(await screen.findByText(/voltou às sugestões/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Voltar às sugestões: In the Flat Field' })).toBeNull()
  })

  it('shows an honest empty state and retries a failed load', async () => {
    vi.mocked(api.getDismissedRecommendations).mockRejectedValueOnce(new Error('offline'))
    renderPage()
    expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível carregar os discos dispensados.')
    vi.mocked(api.getDismissedRecommendations).mockResolvedValueOnce({ albums: [], total: 0, nextOffset: null })
    await userEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }))
    expect(await screen.findByText('Você ainda não dispensou nenhum disco.')).toBeTruthy()
  })
})