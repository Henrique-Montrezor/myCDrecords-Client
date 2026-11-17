import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../services/api'
import type { ApiFeedItem, RecommendationKind, RecommendedAlbum } from '../types/api'
import HomeFeed from './HomeFeed'
import HomeRecommendations from './HomeRecommendations'
import HomePage from '../pages/HomePage'

vi.mock('../hooks/useTrendingAlbums', () => ({
  useTrendingAlbums: () => ({ status: 'ready', albums: [], reload: vi.fn() }),
}))

vi.mock('../contexts/SessionContext', () => ({
  useSession: () => ({ user: { id: 1, username: 'ana', email: 'ana@example.com' } }),
}))

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  getFeed: vi.fn(),
  getRecommendations: vi.fn(),
}))

const base = { user_id: 2, username: 'bia', avatar_url: null, created_at: new Date().toISOString() }

const review: ApiFeedItem = { ...base, type: 'review', id: 1, album_id: 'a1', album_title: 'Blue', album_image: null, album_artist: 'Joni', rating: 5, text: 'Obra-prima.' }
const list: ApiFeedItem = { ...base, type: 'list', id: 2, list_id: 9, list_title: 'Domingo', item_count: 3, album_image: null, text: null }
const follow: ApiFeedItem = { ...base, type: 'follow', id: 3, target_id: 1, target_username: 'ana', target_avatar_url: null }

const renderInRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe('HomeFeed', () => {
  it('renders reviews, lists and follows with links and has no axe violations', async () => {
    vi.mocked(api.getFeed).mockResolvedValue([review, list, follow])
    const { container } = renderInRouter(<HomeFeed />)
    expect(await screen.findByRole('link', { name: 'Blue' })).toHaveProperty('pathname', '/albums/a1')
    expect(screen.getByRole('link', { name: 'Domingo' })).toHaveProperty('pathname', '/lists/9')
    expect(screen.getByText('3 álbuns')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Nota 5 de 5' })).toBeTruthy()
    expect(screen.getByText('você')).toBeTruthy()
    const { violations } = await axe.run(container)
    expect(violations.map((v) => v.id)).toEqual([])
  })

  it('reloads with the friends scope when the tab changes', async () => {
    vi.mocked(api.getFeed).mockResolvedValue([review])
    renderInRouter(<HomeFeed />)
    await screen.findByRole('link', { name: 'Blue' })
    vi.mocked(api.getFeed).mockResolvedValue([])
    await userEvent.click(screen.getByRole('tab', { name: 'Amigos' }))
    expect(await screen.findByText(/follow mútuo/)).toBeTruthy()
    expect(api.getFeed).toHaveBeenLastCalledWith(1, 'friends', expect.any(AbortSignal))
  })

  it('invites the user to find people when there is no activity', async () => {
    vi.mocked(api.getFeed).mockResolvedValue([])
    renderInRouter(<HomeFeed />)
    const link = await screen.findByRole('link', { name: 'Encontrar pessoas' })
    expect(link.getAttribute('href')).toBe('/search?tab=people')
  })

  it('offers a retry when loading fails', async () => {
    vi.mocked(api.getFeed).mockRejectedValueOnce(new Error('falhou'))
    renderInRouter(<HomeFeed />)
    expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível carregar a atividade.')
    vi.mocked(api.getFeed).mockResolvedValue([review])
    await userEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }))
    expect(await screen.findByRole('link', { name: 'Blue' })).toBeTruthy()
  })

  it('appends the next page without repeating entries', async () => {
    const page = Array.from({ length: 10 }, (_, index) => ({ ...review, id: index + 1, album_title: `Disco ${index + 1}` }) as ApiFeedItem)
    vi.mocked(api.getFeed).mockResolvedValueOnce(page)
    renderInRouter(<HomeFeed />)
    await screen.findByRole('link', { name: 'Disco 1' })
    vi.mocked(api.getFeed).mockResolvedValueOnce([page[9], { ...review, id: 11, album_title: 'Disco 11' }])
    await userEvent.click(screen.getByRole('button', { name: 'Ver mais atividade' }))
    expect(await screen.findByRole('link', { name: 'Disco 11' })).toBeTruthy()
    expect(within(screen.getByRole('tabpanel')).getAllByRole('listitem')).toHaveLength(11)
    expect(screen.queryByRole('button', { name: 'Ver mais atividade' })).toBeNull()
  })
})

const album: RecommendedAlbum = { id: 'x1', title: 'Kind of Blue', artist: 'Miles Davis', year: '', cover: '', link: '/albums/x1', reasons: [{ type: 'tags', tags: ['jazz'] }] }
const recs = (kind: RecommendationKind, albums: RecommendedAlbum[], reviews: number) =>
  ({ kind, albums, profile: { reviews, favorites: 0 }, evidence: { signals: kind === 'personalizada' ? 3 : 0, required: 3 }, total: albums.length, nextOffset: null })

describe('HomeRecommendations', () => {
  it('places a standalone album section before activity, without a repeated ML checkbox', async () => {
    vi.mocked(api.getFeed).mockResolvedValue([review])
    vi.mocked(api.getRecommendations).mockResolvedValue({ ...recs('personalizada', [album], 5), mlEnabled: true })
    renderInRouter(<HomePage />)
    await screen.findByRole('link', { name: /Kind of Blue/ })
    const section = screen.getByRole('region', { name: 'Para você' })
    const activity = await screen.findByRole('tabpanel')
    expect(section.compareDocumentPosition(activity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(section).getByRole('list', { name: 'Álbuns recomendados' })).toBeTruthy()
    expect(within(section).queryByRole('checkbox', { name: 'Usar ML experimental no meu feed' })).toBeNull()
  })

  it('lists suggestions with a reason and has no axe violations', async () => {
    vi.mocked(api.getRecommendations).mockResolvedValue(recs('personalizada', [album], 5))
    const { container } = renderInRouter(<HomeRecommendations />)
    expect(await screen.findByRole('link', { name: /Kind of Blue/ })).toHaveProperty('pathname', '/albums/x1')
    expect(screen.getByText('Pelas suas notas em jazz')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver todas' }).getAttribute('href')).toBe('/recommendations')
    expect(screen.queryByText('Conte o que você ouve')).toBeNull()
    const { violations } = await axe.run(container)
    expect(violations.map((v) => v.id)).toEqual([])
  })

  it('asks for reviews or favorites when there is nothing to base suggestions on', async () => {
    vi.mocked(api.getRecommendations).mockResolvedValue(recs('vazio', [], 0))
    renderInRouter(<HomeRecommendations />)
    expect(await screen.findByText('Conte o que você ouve')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Avaliar álbuns' }).getAttribute('href')).toBe('/search')
    expect(screen.getByRole('link', { name: 'Escolher favoritos' }).getAttribute('href')).toBe('/profile/ana')
  })

  it('keeps showing popular albums next to the invitation for a new user', async () => {
    vi.mocked(api.getRecommendations).mockResolvedValue(recs('popular', [album], 0))
    renderInRouter(<HomeRecommendations />)
    expect(await screen.findByText('Conte o que você ouve')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Kind of Blue/ })).toBeTruthy()
  })

  it('nudges users with few reviews to rate more', async () => {
    vi.mocked(api.getRecommendations).mockResolvedValue(recs('popular', [album], 1))
    renderInRouter(<HomeRecommendations />)
    expect(await screen.findByText(/Avalie mais discos/)).toBeTruthy()
    expect(screen.queryByText('Conte o que você ouve')).toBeNull()
  })

  it('offers a retry when loading fails', async () => {
    vi.mocked(api.getRecommendations).mockRejectedValueOnce(new Error('falhou'))
    renderInRouter(<HomeRecommendations />)
    expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível carregar as sugestões.')
  })
})
