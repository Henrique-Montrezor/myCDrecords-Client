import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../services/api'
import DiscoverPage from './DiscoverPage'
import AppShell from '../components/AppShell'
import SearchPage from './SearchPage'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  discoverAlbums: vi.fn(),
  getDiscoverySelection: vi.fn(),
  getRecommendations: vi.fn(),
  searchAlbums: vi.fn(),
  searchArtists: vi.fn(),
  searchTracks: vi.fn(),
}))
vi.mock('../contexts/SessionContext', () => ({
  useSession: () => ({ user: { id: 1, username: 'ana' } }),
}))

const result = {
  albums: [{ id: 'mbid', title: 'Disco de teste', artist: 'Banda de teste', year: '2025', cover: '', link: '/albums/mbid' }],
  source: 'musicbrainz' as const, updatedAt: '2026-10-29T12:00:00Z', total: 25, nextOffset: 12,
}

function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  return <><output aria-label="Endereço">{location.search}</output><output aria-label="Página">{location.pathname}</output><button type="button" onClick={() => navigate(-1)}>Voltar</button></>
}

function renderPage(url = '/discover') {
  return render(<MemoryRouter initialEntries={[url]}><Navigation /><DiscoverPage /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.discoverAlbums).mockReset()
  vi.mocked(api.getDiscoverySelection).mockResolvedValue({
    sectionId: 'editorial', kind: 'editorial', title: 'Escolhas da curadoria', source: 'mycdrecords',
    status: 'empty', revision: 0, curator: null, updatedAt: null, items: [],
  })
  vi.mocked(api.getRecommendations).mockResolvedValue({ kind: 'vazio', albums: [], profile: { reviews: 0, favorites: 0 }, evidence: { signals: 0, required: 3 }, total: 0, nextOffset: null })
  vi.mocked(api.searchAlbums).mockResolvedValue(result.albums)
  vi.mocked(api.searchArtists).mockResolvedValue([])
  vi.mocked(api.searchTracks).mockResolvedValue([])
})
afterEach(cleanup)

describe('DiscoverPage', () => {
  it('starts with albums instead of empty shelves and keeps advanced filters collapsed', async () => {
    vi.mocked(api.discoverAlbums).mockResolvedValue(result)
    renderPage()
    await screen.findByRole('heading', { name: 'Disco de teste' })
    expect(screen.getByRole('searchbox', { name: 'Buscar álbuns, artistas, faixas ou pessoas' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Escolhas da curadoria' })).toBeNull()
    expect(screen.getByText('Nenhuma seleção publicada ainda.').className).toBe('sr-only')
    expect(screen.queryByLabelText('Ano de lançamento')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }))
    expect(screen.getByLabelText('Ano de lançamento')).toBeTruthy()
  })

  it('searches and switches result types without leaving Discover, then returns to exploration', async () => {
    vi.mocked(api.discoverAlbums).mockResolvedValue(result)
    renderPage('/discover?genre=jazz&year=2025')
    await screen.findByRole('heading', { name: 'Disco de teste' })
    await userEvent.type(screen.getByRole('searchbox'), 'the cure{Enter}')
    await waitFor(() => expect(api.searchAlbums).toHaveBeenCalledWith('the cure', expect.any(AbortSignal)))
    expect(screen.getByLabelText('Endereço').textContent).toContain('q=the+cure')
    expect(screen.queryByRole('heading', { name: 'Discos de 2025' })).toBeNull()
    await userEvent.click(screen.getByRole('tab', { name: 'Artistas' }))
    await waitFor(() => expect(api.searchArtists).toHaveBeenCalledWith('the cure', expect.any(AbortSignal)))
    expect(screen.getByLabelText('Endereço').textContent).toContain('tab=artists')
    await userEvent.click(screen.getByRole('button', { name: 'Limpar busca' }))
    await screen.findByRole('heading', { name: 'Disco de teste' })
    expect(screen.getByLabelText('Endereço').textContent).toContain('genre=jazz')
    expect(screen.getByLabelText('Endereço').textContent).not.toContain('q=')
  })

  it('shows existing recommendations with their real reason, not a catalog disguised as personalization', async () => {
    vi.mocked(api.discoverAlbums).mockResolvedValue(result)
    vi.mocked(api.getRecommendations).mockResolvedValue({
      kind: 'personalizada', albums: [{ ...result.albums[0], id: 'rec', title: 'Uma sugestão real', link: '/albums/rec', reasons: [{ type: 'tags', tags: ['jazz'] }] }],
      profile: { reviews: 4, favorites: 0 }, evidence: { signals: 4, required: 3 }, total: 1, nextOffset: null,
    })
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Uma sugestão real' })).toBeTruthy()
    expect(screen.getByText('Escolhidos a partir das suas notas e favoritos.')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Uma sugestão real/ }).getAttribute('href')).toBe('/albums/rec')
  })

  it('restores a direct query and result type and supports keyboard navigation between types', async () => {
    vi.mocked(api.discoverAlbums).mockResolvedValue(result)
    renderPage('/discover?q=the+cure&tab=artists')
    expect(await screen.findByText('Nenhum artista encontrado para “the cure”.')).toBeTruthy()
    expect(screen.getByRole('searchbox').getAttribute('value')).toBe('the cure')
    expect(api.discoverAlbums).not.toHaveBeenCalled()
    expect(api.getRecommendations).not.toHaveBeenCalled()
    const artists = screen.getByRole('tab', { name: 'Artistas' })
    artists.focus()
    await userEvent.keyboard('{ArrowRight}')
    await waitFor(() => expect(api.searchTracks).toHaveBeenCalledWith('the cure', expect.any(AbortSignal)))
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Faixas' }))
    expect(screen.getByRole('tab', { name: 'Faixas' }).getAttribute('aria-selected')).toBe('true')
    await userEvent.click(screen.getByRole('button', { name: 'Voltar a explorar' }))
    expect(screen.getByRole('searchbox').getAttribute('value')).toBe('')
  })

  it('restores the exploration URL and search input when going back', async () => {
    vi.mocked(api.discoverAlbums).mockResolvedValue(result)
    renderPage('/discover?genre=jazz&year=2025')
    await userEvent.type(screen.getByRole('searchbox'), 'blue{Enter}')
    await screen.findByRole('heading', { name: '1 álbum para “blue”' })
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await screen.findByRole('heading', { name: 'Disco de teste' })
    expect(screen.getByRole('searchbox').getAttribute('value')).toBe('')
    expect(screen.getByLabelText('Endereço').textContent).toBe('?genre=jazz&year=2025')
  })

  it('surfaces recommendation failures with retry while keeping the catalog usable', async () => {
    vi.mocked(api.discoverAlbums).mockResolvedValue(result)
    vi.mocked(api.getRecommendations).mockRejectedValueOnce(new Error('offline'))
    renderPage()
    await screen.findByRole('heading', { name: 'Disco de teste' })
    expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível carregar as sugestões.')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await screen.findByText(/Ainda não há sugestões/)
    expect(api.getRecommendations).toHaveBeenCalledTimes(2)
    expect(api.discoverAlbums).toHaveBeenCalledTimes(1)
  })

  it('loads URL filters and navigates to the next catalog page', async () => {
    vi.mocked(api.discoverAlbums).mockResolvedValue(result)
    renderPage('/discover?genre=gothic+rock&year=2025&type=ep')
    expect(await screen.findByRole('heading', { name: 'Disco de teste' })).toBeTruthy()
    expect(api.discoverAlbums).toHaveBeenLastCalledWith({ genre: 'gothic rock', year: '2025', type: 'ep', offset: '0' }, expect.any(AbortSignal))
    expect(screen.getByRole('link', { name: /Disco de teste/ }).getAttribute('href')).toBe('/albums/mbid')
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }))
    await waitFor(() => expect(api.discoverAlbums).toHaveBeenLastCalledWith(expect.objectContaining({ offset: '12' }), expect.any(AbortSignal)))
    expect(screen.getByLabelText('Endereço').textContent).toContain('offset=12')
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await waitFor(() => expect(api.discoverAlbums).toHaveBeenLastCalledWith(expect.objectContaining({ offset: '0' }), expect.any(AbortSignal)))
  })

  it('applies filters, resets pagination and can clear them', async () => {
    vi.mocked(api.discoverAlbums).mockResolvedValue(result)
    renderPage('/discover?offset=12')
    await screen.findByRole('heading', { name: 'Disco de teste' })
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }))
    await userEvent.selectOptions(screen.getByLabelText('Gênero'), 'gothic rock')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(api.discoverAlbums).toHaveBeenLastCalledWith(expect.objectContaining({ genre: 'gothic rock', offset: '0' }), expect.any(AbortSignal)))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Filtros/ }))
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    await waitFor(() => expect(screen.getByLabelText('Endereço').textContent).toBe(''))
  })

  it('shows loading, then an error with retry, then empty results', async () => {
    vi.mocked(api.discoverAlbums).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...result, albums: [], total: 0, nextOffset: null })
    renderPage()
    expect(screen.getByText('Consultando o catálogo...')).toBeTruthy()
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Nenhum disco encontrado com estes filtros.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Próxima página' })).toBeNull()
  })

  it('explains invalid URL filters and allows recovery', async () => {
    vi.mocked(api.discoverAlbums).mockResolvedValue(result)
    renderPage('/discover?year=abc')
    expect(screen.getByRole('alert').textContent).toContain('Filtros inválidos')
    expect(api.discoverAlbums).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(await screen.findByRole('heading', { name: 'Disco de teste' })).toBeTruthy()
  })

  it('has accessible filters, headings and navigation', async () => {
    vi.mocked(api.discoverAlbums).mockResolvedValue(result)
    const { container } = renderPage()
    await screen.findByRole('heading', { name: 'Disco de teste' })
    expect((await axe.run(container)).violations.map((violation) => violation.id)).toEqual([])
  })

  it('retries editorial failure without reloading successful catalog results', async () => {
    vi.mocked(api.discoverAlbums).mockResolvedValue(result)
    vi.mocked(api.getDiscoverySelection).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      sectionId: 'editorial', kind: 'editorial', title: 'Escolhas da curadoria', source: 'mycdrecords',
      status: 'empty', revision: 0, curator: null, updatedAt: null, items: [],
    })
    renderPage('/discover')
    expect(await screen.findByRole('heading', { name: 'Disco de teste' })).toBeTruthy()
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Nenhuma seleção publicada ainda.')).toBeTruthy()
    expect(api.discoverAlbums).toHaveBeenCalledTimes(1)
    expect(api.getDiscoverySelection).toHaveBeenCalledTimes(2)
    expect(screen.getByLabelText('Endereço').textContent).toBe('')
  })

  it('keeps the editorial section available when the catalog fails', async () => {
    vi.mocked(api.discoverAlbums).mockRejectedValue(new Error('provider offline'))
    renderPage()
    expect(await screen.findByText('Nenhuma seleção publicada ainda.')).toBeTruthy()
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('searchbox')).toBeTruthy()
  })
});

describe('Unified search in the app shell', () => {
  function renderShell(url: string) {
    return render(<MemoryRouter initialEntries={[url]}><Routes><Route element={<AppShell />}>
      <Route index element={<Navigation />} />
      <Route path="discover" element={<><Navigation /><DiscoverPage /></>} />
      <Route path="search" element={<><Navigation /><SearchPage /></>} />
    </Route></Routes></MemoryRouter>)
  }

  it('routes global search to Discover without a second input or a delayed navigation after clear', async () => {
    vi.mocked(api.discoverAlbums).mockResolvedValue(result)
    renderShell('/')
    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar' }), 'blue')
    await screen.findByRole('heading', { name: '1 álbum para “blue”' })
    expect(screen.getByLabelText('Página').textContent).toBe('/discover')
    expect(screen.getAllByRole('searchbox')).toHaveLength(1)
    expect(screen.queryByRole('textbox', { name: 'Buscar' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Limpar busca' }))
    await screen.findByRole('heading', { name: 'Disco de teste' })
    await userEvent.type(screen.getByRole('searchbox'), 'draft only')
    await new Promise((resolve) => setTimeout(resolve, 350))
    expect(screen.getByLabelText('Endereço').textContent).toBe('')
    expect(api.searchAlbums).toHaveBeenCalledTimes(1)
  })

  it('focuses the single discovery input with Ctrl+K and has no axe violations', async () => {
    vi.mocked(api.discoverAlbums).mockResolvedValue(result)
    const { container } = renderShell('/discover')
    await screen.findByRole('heading', { name: 'Disco de teste' })
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(document.activeElement).toBe(screen.getByRole('searchbox'))
    expect((await axe.run(container)).violations.map((violation) => violation.id)).toEqual([])
  })

  it('keeps existing search URLs working in their original route', async () => {
    renderShell('/search?q=blue')
    await screen.findByRole('heading', { name: '1 álbum para “blue”' })
    expect(screen.getByRole('textbox', { name: 'Buscar' }).getAttribute('value')).toBe('blue')
    expect(screen.getByLabelText('Página').textContent).toBe('/search')
    expect(screen.queryByRole('searchbox')).toBeNull()
  })
})
