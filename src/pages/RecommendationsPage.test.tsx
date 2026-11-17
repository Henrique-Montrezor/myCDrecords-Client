import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../services/api'
import type { RecommendationsPage as Page, RecommendedAlbum } from '../types/api'
import RecommendationsPage from './RecommendationsPage'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  getRecommendations: vi.fn(),
  dismissRecommendation: vi.fn(),
  undoDismissRecommendation: vi.fn(),
  getRecommendationPreferences: vi.fn(),
  saveRecommendationPreferences: vi.fn(),
  saveRecommendationEngine: vi.fn(),
}))

const disc = (id: string, title: string, reasons: RecommendedAlbum['reasons']): RecommendedAlbum =>
  ({ id, title, artist: 'Bauhaus', year: '1980', cover: '', link: `/albums/${id}`, reasons })

const personal: Page = {
  kind: 'personalizada',
  albums: [
    disc('a', 'In the Flat Field', [{ type: 'tags', tags: ['gothic rock', 'post-punk'] }, { type: 'collaborative', people: 3 }, { type: 'preferences', genres: ['gothic rock'], artists: ['Bauhaus'] }]),
    disc('b', 'Bloody Kisses', [{ type: 'exploration', tag: 'gothic metal', from: 'gothic rock' }]),
  ],
  profile: { reviews: 4, favorites: 1 }, evidence: { signals: 4, required: 3 }, total: 3, nextOffset: 2,
}

const renderPage = (route = '/recommendations') => render(<MemoryRouter initialEntries={[route]}><RecommendationsPage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.dismissRecommendation).mockResolvedValue(undefined)
  vi.mocked(api.undoDismissRecommendation).mockResolvedValue(undefined)
  vi.mocked(api.getRecommendationPreferences).mockResolvedValue({ genres: [], artists: [] })
  vi.mocked(api.saveRecommendationPreferences).mockImplementation(async (preferences) => preferences)
  vi.mocked(api.saveRecommendationEngine).mockImplementation(async (enabled) => ({ enabled }))
})
afterEach(cleanup)

describe('RecommendationsPage', () => {
  it('saves explicit activation, removes the checkbox and uses the account choice on remount', async () => {
    const active = Object.assign({}, personal, {
      mlEnabled: true,
      ml: { status: 'active', modelVersion: 'artist-bpr-fictional-v1', trainedOn: 'fictional-profiles', supportedArtists: ['The Cure', 'Miles Davis'] },
      albums: [disc('a', 'In the Flat Field', [{ type: 'ml' }])],
    })
    vi.mocked(api.getRecommendations).mockResolvedValueOnce(personal).mockResolvedValue(active)
    const view = renderPage()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Usar ML experimental no meu feed' }))
    await waitFor(() => expect(api.saveRecommendationEngine).toHaveBeenCalledWith(true))
    expect(await screen.findByText(/Treinado com perfis fictícios/)).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: 'Usar ML experimental no meu feed' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Para você', level: 1 }))
    expect(api.getRecommendations).toHaveBeenLastCalledWith(expect.any(AbortSignal), 12)
    expect(screen.getByText('Por afinidade entre artistas no modelo experimental')).toBeTruthy()
    expect((await axe.run(view.container)).violations).toEqual([])
    view.unmount()
    renderPage()
    await screen.findByText('Por afinidade entre artistas no modelo experimental')
    expect(screen.queryByRole('checkbox', { name: 'Usar ML experimental no meu feed' })).toBeNull()
    expect(api.saveRecommendationEngine).toHaveBeenCalledTimes(1)
  })

  it('keeps the activation visible after a failed save and offers retry', async () => {
    vi.mocked(api.getRecommendations).mockResolvedValue(personal)
    vi.mocked(api.saveRecommendationEngine).mockRejectedValueOnce(new Error('offline'))
    renderPage('/recommendations?engine=ml')
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Usar ML experimental no meu feed' }))
    expect(await screen.findByText(/Não foi possível salvar a escolha/)).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Usar ML experimental no meu feed' })).toHaveProperty('checked', false)
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(api.saveRecommendationEngine).toHaveBeenCalledTimes(2))
  })

  it('does not describe a cold-start fallback as an ML ranking', async () => {
    vi.mocked(api.getRecommendations).mockResolvedValue(Object.assign({}, personal, {
      mlEnabled: true,
      ml: { status: 'cold_start', modelVersion: 'artist-bpr-fictional-v1', trainedOn: 'fictional-profiles', supportedArtists: ['The Cure'] },
    }))
    renderPage('/recommendations?engine=ml')
    expect(await screen.findByText(/Sem sinais positivos de artistas suportados/)).toBeTruthy()
    expect(screen.getByText(/Exibindo o motor original, não o ranking ML/)).toBeTruthy()
  })

  it('lets a new profile choose supported artists without depending on external search', async () => {
    vi.mocked(api.getRecommendations).mockResolvedValue(Object.assign({}, personal, {
      mlEnabled: true,
      ml: { status: 'cold_start', modelVersion: 'artist-bpr-fictional-v1', trainedOn: 'fictional-profiles', supportedArtists: ['The Cure', 'Miles Davis'] },
    }))
    renderPage('/recommendations?engine=ml')
    await screen.findByText(/Sem sinais positivos de artistas suportados/)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Artista' }), 'The Cure')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar artista' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar preferências' }))
    expect(api.saveRecommendationPreferences).toHaveBeenCalledWith({ genres: [], artists: ['The Cure'] })
    expect(await screen.findByText(/Preferências salvas/)).toBeTruthy()
  })

  it('explains every album with the signals that were used and has no axe violations', async () => {
    vi.mocked(api.getRecommendations).mockResolvedValue(personal)
    const { container } = renderPage()
    expect(await screen.findByRole('link', { name: 'In the Flat Field' })).toHaveProperty('pathname', '/albums/a')
    expect(screen.getByText('Pelas suas notas em gothic rock e post-punk')).toBeTruthy()
    expect(screen.getByText('Bem avaliado por 3 pessoas com gosto próximo')).toBeTruthy()
    expect(screen.getByText('Pelas suas preferências: gothic rock e Bauhaus')).toBeTruthy()
    expect(screen.getByText('Para explorar: gothic metal, vizinho de gothic rock')).toBeTruthy()
    expect(screen.queryByText(/Ainda não são sugestões/)).toBeNull()
    const { violations } = await axe.run(container)
    expect(violations.map((v) => v.id)).toEqual([])
  })

  it('does not present community picks as personalized', async () => {
    vi.mocked(api.getRecommendations).mockResolvedValue({ ...personal, kind: 'popular', evidence: { signals: 1, required: 3 }, nextOffset: null,
      albums: [disc('c', 'Disintegration', [{ type: 'community', people: 2 }])] })
    renderPage()
    expect(await screen.findByText('Ainda não são sugestões pelo seu gosto')).toBeTruthy()
    expect(screen.getByText(/mais 2 itens/)).toBeTruthy()
    expect(screen.getByText('Nota alta de 2 pessoas da comunidade')).toBeTruthy()
  })

  it('dismisses an album, focuses undo and restores it', async () => {
    vi.mocked(api.getRecommendations).mockResolvedValue(personal)
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Não tenho interesse em In the Flat Field' }))
    expect(api.dismissRecommendation).toHaveBeenCalledWith('a')
    expect(await screen.findByText(/não será mais sugerido/)).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'In the Flat Field' })).toBeNull()
    const undo = screen.getByRole('button', { name: 'Desfazer' })
    await waitFor(() => expect(document.activeElement).toBe(undo))
    await userEvent.click(undo)
    expect(api.undoDismissRecommendation).toHaveBeenCalledWith('a')
    expect(await screen.findByRole('link', { name: 'In the Flat Field' })).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 2 })[1].textContent).toBe('In the Flat Field')
  })

  it('keeps the album when dismissing fails', async () => {
    vi.mocked(api.getRecommendations).mockResolvedValue(personal)
    vi.mocked(api.dismissRecommendation).mockRejectedValueOnce(new Error('offline'))
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Não tenho interesse em Bloody Kisses' }))
    expect(await screen.findByText(/Não foi possível dispensar/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Bloody Kisses' })).toBeTruthy()
  })

  it('loads more from the number of albums on screen without duplicates', async () => {
    vi.mocked(api.getRecommendations).mockResolvedValueOnce(personal)
    const { container } = renderPage()
    await screen.findByRole('link', { name: 'In the Flat Field' })
    vi.mocked(api.getRecommendations).mockResolvedValueOnce({ ...personal, albums: [personal.albums[1], disc('d', 'Mask', [{ type: 'tags', tags: ['gothic rock'] }])], nextOffset: null })
    await userEvent.click(screen.getByRole('button', { name: 'Ver mais sugestões' }))
    expect(await screen.findByRole('link', { name: 'Mask' })).toBeTruthy()
    expect(api.getRecommendations).toHaveBeenLastCalledWith(undefined, 12, 2)
    expect(container.querySelectorAll('.recs-entry h2')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Ver mais sugestões' })).toBeNull()
  })

  it('shows an empty state and retries after an error', async () => {
    vi.mocked(api.getRecommendations).mockRejectedValueOnce(new Error('offline'))
    renderPage()
    expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível carregar as sugestões.')
    vi.mocked(api.getRecommendations).mockResolvedValueOnce({ ...personal, kind: 'vazio', albums: [], total: 0, nextOffset: null })
    await userEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }))
    expect(await screen.findByText(/Ainda não há discos para sugerir/)).toBeTruthy()
  })

  it('reloads from the start instead of mixing engines changed in another settings tab', async () => {
    const active: Page = {
      ...personal, mlEnabled: true, albums: [disc('new', 'Novo ranking', [{ type: 'ml' }])], nextOffset: null,
      ml: { status: 'active', modelVersion: 'artist-bpr-fictional-v1', trainedOn: 'fictional-profiles', supportedArtists: ['The Cure'] },
    }
    vi.mocked(api.getRecommendations).mockResolvedValueOnce(personal).mockResolvedValue(active)
    renderPage()
    await screen.findByRole('link', { name: 'In the Flat Field' })
    await userEvent.click(screen.getByRole('button', { name: 'Ver mais sugestões' }))
    await screen.findByRole('link', { name: 'Novo ranking' })
    await waitFor(() => expect(screen.queryByRole('link', { name: 'In the Flat Field' })).toBeNull())
    expect(api.getRecommendations).toHaveBeenLastCalledWith(expect.any(AbortSignal), 12)
    expect(screen.queryByRole('checkbox', { name: 'Usar ML experimental no meu feed' })).toBeNull()
  })
})
