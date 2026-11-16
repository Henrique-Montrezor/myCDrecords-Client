import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { StrictMode, type ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from '../App'
import * as api from '../services/api'
import type { ApiListDetails } from '../types/api'
import ListDetailPage from './ListDetailPage'

const session = vi.hoisted(() => ({ status: 'anonymous', user: null as { id: number; username: string } | null, retry: vi.fn() }))
vi.mock('../contexts/SessionContext', () => ({ useSession: () => session, SessionProvider: ({ children }: { children: ReactNode }) => children }))
vi.mock('../services/api', async (original) => ({ ...(await original<typeof api>()), getList: vi.fn(), removeAlbumFromList: vi.fn(), setListSaved: vi.fn(), moveListItem: vi.fn() }))
vi.mock('../components/AppShell', () => ({ default: () => <main><Outlet /></main> }))
const list: ApiListDetails = {
  id: 4, user_id: 8, title: 'Mil escutas', username: 'bia', description: null, is_public: true, item_count: 1000, is_saved: false,
  created_at: '2026-10-29', updated_at: '2026-10-29', page: 1, pageSize: 24, totalPages: 42, order_revision: 0,
  items: [{ id: 1, list_id: 4, album_id: 'mbid', album_title: 'Disco de abertura', album_image: null, album_artist: 'Banda', position: 0, created_at: '2026-10-29' }],
}
beforeEach(() => {
  vi.clearAllMocks()
  session.status = 'anonymous'
  session.user = null
  vi.mocked(api.getList).mockResolvedValue(list)
})
afterEach(cleanup)
const detail = (url = '/lists/4', strict = false) => {
  const view = <MemoryRouter initialEntries={[url]}><Routes><Route path="/lists/:listId" element={<ListDetailPage />} /></Routes></MemoryRouter>
  return render(strict ? <StrictMode>{view}</StrictMode> : view)
}

it('opens a public list anonymously through the actual app route without owner actions', async () => {
  render(<MemoryRouter initialEntries={['/lists/4']}><App /></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: 'Mil escutas' })).toBeTruthy()
  expect(screen.getByText('1.000 álbuns', { exact: false })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Entrar para salvar' }).getAttribute('href')).toBe('/lists/4?login=1')
  expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull()
})

it('waits for the session before requesting details and does not treat an unavailable session as signed out', () => {
  session.status = 'loading'
  const { unmount } = render(<MemoryRouter initialEntries={['/lists/4']}><App /></MemoryRouter>)
  expect(screen.getByText('Preparando a lista...')).toBeTruthy()
  expect(api.getList).not.toHaveBeenCalled()
  unmount()
  session.status = 'unavailable'
  render(<MemoryRouter initialEntries={['/lists/4?login=1']}><App /></MemoryRouter>)
  expect(screen.getByRole('alert').textContent).toContain('verificar sua sessão')
  expect(screen.queryByRole('heading', { name: 'Entre na sua conta.' })).toBeNull()
})

it('requests the next page while keeping the global count and offers a private-list state', async () => {
  detail()
  await userEvent.click(await screen.findByRole('button', { name: 'Próxima página' }))
  await waitFor(() => expect(api.getList).toHaveBeenLastCalledWith(4, expect.any(AbortSignal), 2))
})

it('shows private denial without exposing actions or content', async () => {
  vi.mocked(api.getList).mockRejectedValue(new api.ApiError(403, { message: 'Lista privada' }))
  detail()
  expect(await screen.findByRole('heading', { name: 'Lista privada.' })).toBeTruthy()
  expect(screen.queryByText('Disco de abertura')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Salvar Mil escutas' })).toBeNull()
})

it('refreshes paged items and their global count after an owner removal', async () => {
  session.status = 'authenticated'
  session.user = { id: 8, username: 'bia' }
  vi.mocked(api.removeAlbumFromList).mockResolvedValue(undefined)
  vi.mocked(api.getList).mockResolvedValueOnce(list).mockResolvedValue({ ...list, item_count: 999, items: [{ ...list.items[0], id: 2, album_title: 'Próximo disco' }] })
  detail()
  await userEvent.click(await screen.findByRole('button', { name: 'Remover Disco de abertura da lista' }))
  expect(await screen.findByRole('heading', { name: 'Próximo disco' })).toBeTruthy()
  expect(screen.getByText('999 álbuns', { exact: false })).toBeTruthy()
})

it('shows recovery rather than an empty-list claim for an out-of-range page', async () => {
  vi.mocked(api.getList).mockResolvedValue({ ...list, page: 43, items: [] })
  detail('/lists/4?page=43')
  expect(await screen.findByText('Nenhum álbum nesta página.')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Ir para a primeira página' }))
  await waitFor(() => expect(api.getList).toHaveBeenLastCalledWith(4, expect.any(AbortSignal), 1))
})

it('moves to another page with the current revision, announces success and focuses the moved item', async () => {
  session.status = 'authenticated'
  session.user = { id: 8, username: 'bia' }
  vi.mocked(api.moveListItem).mockResolvedValue({ revision: 1, page: 2 })
  vi.mocked(api.getList).mockImplementation(async (_id, _signal, page = 1) => ({ ...list, page, order_revision: page === 2 ? 1 : 0 }))
  detail('/lists/4', true)
  await userEvent.click(await screen.findByRole('button', { name: 'Organizar álbuns' }))
  const input = screen.getByRole('spinbutton', { name: 'Nova posição de Disco de abertura' })
  await userEvent.clear(input)
  await userEvent.type(input, '25{Enter}')
  await waitFor(() => expect(api.moveListItem).toHaveBeenCalledWith(4, { revision: 0, itemId: 1, toPosition: 25 }))
  await waitFor(() => expect(api.getList).toHaveBeenLastCalledWith(4, expect.any(AbortSignal), 2))
  expect(await screen.findByText('Álbum movido para a posição 25.')).toBeTruthy()
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Mover Disco de abertura para cima' })))
})

it('preserves order on conflict, blocks stale retries and allows an explicit refresh', async () => {
  session.status = 'authenticated'
  session.user = { id: 8, username: 'bia' }
  vi.mocked(api.moveListItem).mockRejectedValue(new api.ApiError(409, { message: 'A ordem mudou.' }))
  detail()
  await userEvent.click(await screen.findByRole('button', { name: 'Organizar álbuns' }))
  await userEvent.click(screen.getByRole('button', { name: 'Mover Disco de abertura para baixo' }))
  expect((await screen.findByRole('alert')).textContent).toContain('A ordem mudou em outra sessão')
  expect(screen.getByRole('heading', { name: 'Disco de abertura' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Mover Disco de abertura para baixo' }).hasAttribute('disabled')).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: 'Atualizar lista' }))
  await waitFor(() => expect(api.getList).toHaveBeenCalledTimes(2))
  expect(await screen.findByRole('button', { name: 'Mover Disco de abertura para baixo' })).toBeTruthy()
})

it('shows failed moves without announcing success or changing local order', async () => {
  session.status = 'authenticated'
  session.user = { id: 8, username: 'bia' }
  vi.mocked(api.moveListItem).mockRejectedValue(new Error('offline'))
  detail()
  await userEvent.click(await screen.findByRole('button', { name: 'Organizar álbuns' }))
  await userEvent.click(screen.getByRole('button', { name: 'Mover Disco de abertura para baixo' }))
  expect((await screen.findByRole('alert')).textContent).toContain('A ordem foi mantida')
  expect(api.getList).toHaveBeenCalledTimes(1)
  expect(screen.queryByText(/Álbum movido para/)).toBeNull()
})
