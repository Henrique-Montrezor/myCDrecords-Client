import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as api from '../services/api'
import ListsPage from './ListsPage'

vi.mock('../services/api', async (original) => ({ ...(await original<typeof api>()), exploreLists: vi.fn(), setListSaved: vi.fn(), createList: vi.fn() }))
vi.mock('../contexts/SessionContext', () => ({ useSession: () => ({ user: { id: 7, username: 'ana' } }) }))
const list = {
  id: 4, user_id: 8, title: 'Noites de post-punk', description: 'Discos para depois da meia-noite.', username: 'bia',
  is_public: true as const, item_count: 30, save_count: 4, is_saved: false,
  created_at: '2026-10-29T12:00:00Z', updated_at: '2026-10-29T12:00:00Z', previews: [],
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.exploreLists).mockResolvedValue({ items: [list], page: 1, pageSize: 20, totalPages: 2, total: 21, mode: 'recent' })
  vi.mocked(api.setListSaved).mockResolvedValue(undefined)
})
afterEach(cleanup)
const renderPage = (url = '/lists') => render(<MemoryRouter initialEntries={[url]}><ListsPage /></MemoryRouter>)

it('shows actual list authors and counts and labels the recent fallback honestly', async () => {
  renderPage()
  expect(await screen.findByRole('heading', { name: 'Noites de post-punk' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'bia' }).getAttribute('href')).toBe('/profile/bia')
  expect(screen.getByText('30 álbuns')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Listas recentes' })).toBeTruthy()
})

it('loads URL scopes, searches and resets pagination when switching scopes', async () => {
  renderPage('/lists?scope=friends&q=dark&page=2&sort=recent')
  await screen.findByRole('heading', { name: 'Noites de post-punk' })
  expect(api.exploreLists).toHaveBeenLastCalledWith({ scope: 'friends', q: 'dark', page: 2, sort: 'recent' }, expect.any(AbortSignal))
  await userEvent.click(screen.getByRole('link', { name: 'Salvas' }))
  await waitFor(() => expect(api.exploreLists).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'saved', page: 1 }), expect.any(AbortSignal)))
  await userEvent.clear(screen.getByRole('searchbox'))
  await userEvent.type(screen.getByRole('searchbox'), 'gótico{Enter}')
  await waitFor(() => expect(api.exploreLists).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'gótico', page: 1 }), expect.any(AbortSignal)))
})

it('saves optimistically and rolls back an explicit failure', async () => {
  vi.mocked(api.setListSaved).mockRejectedValueOnce(new Error('offline'))
  renderPage()
  await userEvent.click(await screen.findByRole('button', { name: 'Salvar Noites de post-punk' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível')
  expect(screen.getByRole('button', { name: 'Salvar Noites de post-punk' }).getAttribute('aria-pressed')).toBe('false')
})

it('loads the next server page and offers retry on discovery failure', async () => {
  vi.mocked(api.exploreLists).mockRejectedValueOnce(new Error('offline'))
  renderPage()
  await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
  await screen.findByRole('heading', { name: 'Noites de post-punk' })
  await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }))
  await waitFor(() => expect(api.exploreLists).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), expect.any(AbortSignal)))
})

it('preserves creating lists and switches to mine after a successful creation', async () => {
  vi.mocked(api.createList).mockResolvedValue({ listId: 5 })
  renderPage()
  await userEvent.click(screen.getByRole('button', { name: 'Nova lista' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Nome da lista' }), 'Minhas descobertas')
  await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }))
  await waitFor(() => expect(api.exploreLists).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'mine', page: 1 }), expect.any(AbortSignal)))
  expect(api.createList).toHaveBeenCalledWith(expect.objectContaining({ title: 'Minhas descobertas' }))
})

it('does not request invalid URL filters and recovers without hiding them', async () => {
  renderPage('/lists?page=0')
  expect(screen.getByRole('alert').textContent).toContain('Filtros de listas inválidos')
  expect(api.exploreLists).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByRole('heading', { name: 'Noites de post-punk' })).toBeTruthy()
})

it('distinguishes an out-of-range page from an empty collection', async () => {
  vi.mocked(api.exploreLists).mockResolvedValue({ items: [], page: 5, pageSize: 20, totalPages: 1, total: 1, mode: 'recent' })
  renderPage('/lists?page=5')
  expect(await screen.findByText('Nenhuma lista nesta página.')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Ir para a primeira página' }))
  await waitFor(() => expect(api.exploreLists).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }), expect.any(AbortSignal)))
})

it('keeps discovery keyboard-accessible with no axe violations', async () => {
  const { container } = renderPage()
  await screen.findByRole('heading', { name: 'Noites de post-punk' })
  screen.getByRole('searchbox').focus()
  await userEvent.tab()
  expect(screen.getByRole('combobox')).toBe(document.activeElement)
  expect((await axe.run(container)).violations.map((violation) => violation.id)).toEqual([])
})

it('does not describe an explicit recent sort as insufficient ranking data', async () => {
  renderPage('/lists?sort=recent')
  await screen.findByRole('heading', { name: 'Noites de post-punk' })
  expect(screen.queryByText(/Ainda sem amostra/)).toBeNull()
})
