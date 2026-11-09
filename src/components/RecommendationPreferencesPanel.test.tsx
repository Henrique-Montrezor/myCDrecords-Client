import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../services/api'
import RecommendationPreferencesPanel from './RecommendationPreferencesPanel'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  getRecommendationPreferences: vi.fn(),
  saveRecommendationPreferences: vi.fn(),
  searchArtists: vi.fn(),
}))

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.getRecommendationPreferences).mockResolvedValue({ genres: [], artists: [] })
  vi.mocked(api.saveRecommendationPreferences).mockImplementation(async (preferences) => preferences)
})

describe('RecommendationPreferencesPanel', () => {
  it('saves explicit genres and a MusicBrainz artist selection', async () => {
    const onSaved = vi.fn()
    vi.mocked(api.searchArtists).mockResolvedValue([{ id: 'artist-id', name: 'Bauhaus', type: 'Group', country: null, years: null, disambiguation: null }])
    render(<RecommendationPreferencesPanel onSaved={onSaved} />)

    const genre = await screen.findByLabelText('Estilo ou gênero')
    await userEvent.type(genre, 'Gothic Rock')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    await userEvent.type(genre, 'Darkwave')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    await userEvent.type(screen.getByLabelText('Artista'), 'Bauhaus')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await userEvent.click(await screen.findByRole('button', { name: /Bauhaus/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar preferências' }))

    expect(api.saveRecommendationPreferences).toHaveBeenCalledWith({ genres: ['gothic rock', 'darkwave'], artists: ['Bauhaus'] })
    expect(onSaved).toHaveBeenCalledOnce()
    expect((await screen.findByRole('status')).textContent).toContain('Preferências salvas.')
  })

  it('offers retry when stored preferences cannot be loaded', async () => {
    vi.mocked(api.getRecommendationPreferences).mockRejectedValueOnce(new Error('offline'))
    render(<RecommendationPreferencesPanel onSaved={vi.fn()} />)
    expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível carregar suas preferências.')
    vi.mocked(api.getRecommendationPreferences).mockResolvedValueOnce({ genres: ['ambient'], artists: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('ambient')).toBeTruthy()
  })
})