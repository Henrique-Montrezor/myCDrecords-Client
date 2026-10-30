import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDiscoverySelection } from '../services/api'
import type { DiscoverySelectionData } from '../types/api'
import DiscoverySelection from './DiscoverySelection'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  getDiscoverySelection: vi.fn(),
}))

const selection: DiscoverySelectionData = {
  sectionId: 'editorial', kind: 'editorial', title: 'Escolhas da curadoria', source: 'mycdrecords', status: 'ready',
  revision: 1, curator: 'editora', updatedAt: '2026-10-29T12:00:00Z',
  items: [
    { album: { id: 'mb1', title: 'Disco escolhido', artist: 'Banda escolhida', year: '2025', cover: '', link: '/albums/mb1' }, note: 'Uma escolha com motivo e autoria.' },
    { album: { id: 'mb2', title: 'Outra escuta', artist: 'Outra banda', year: '2024', cover: '', link: '/albums/mb2' }, note: 'Um contraponto para a seleção.' },
  ],
}

beforeEach(() => vi.mocked(getDiscoverySelection).mockReset())
afterEach(cleanup)

describe('DiscoverySelection', () => {
  it('renders album links, editorial reasons, source and attribution with no axe violations', async () => {
    vi.mocked(getDiscoverySelection).mockResolvedValue(selection)
    const { container } = render(<MemoryRouter><DiscoverySelection /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Disco escolhido' })).toBeTruthy()
    expect(screen.getByText('Uma escolha com motivo e autoria.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'editora' }).getAttribute('href')).toBe('/profile/editora')
    expect(screen.getByRole('link', { name: 'Abrir Disco escolhido' }).getAttribute('href')).toBe('/albums/mb1')
    expect(screen.getByRole('heading', { name: 'Outra escuta' })).toBeTruthy()
    expect((await axe.run(container)).violations.map((violation) => violation.id)).toEqual([])
  })

  it('does not reserve a shelf for an unpublished selection', async () => {
    vi.mocked(getDiscoverySelection).mockResolvedValue({ ...selection, status: 'empty', revision: 0, curator: null, updatedAt: null, items: [] })
    render(<MemoryRouter><DiscoverySelection /></MemoryRouter>)
    expect(screen.getByText('Carregando as escolhas da curadoria...')).toBeTruthy()
    expect(await screen.findByText('Nenhuma seleção publicada ainda.')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Escolhas da curadoria' })).toBeNull()
  })

  it('retries selection failures without depending on catalog results', async () => {
    vi.mocked(getDiscoverySelection).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(selection)
    render(<MemoryRouter><DiscoverySelection /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('heading', { name: 'Disco escolhido' })).toBeTruthy()
    expect(getDiscoverySelection).toHaveBeenCalledTimes(2)
  })

  it('falls back after cover failure while keeping the album link and full note', async () => {
    const lead = selection.items[0]
    vi.mocked(getDiscoverySelection).mockResolvedValue({ ...selection, items: [{ ...lead, album: { ...lead.album, cover: 'https://coverartarchive.org/test.jpg' } }] })
    render(<MemoryRouter><DiscoverySelection /></MemoryRouter>)
    fireEvent.error(await screen.findByRole('img', { name: 'Capa de Disco escolhido' }))
    expect(screen.getByText('Capa indisponível')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Abrir Disco escolhido' }).getAttribute('href')).toBe('/albums/mb1')
    expect(screen.getByText(lead.note)).toBeTruthy()
  })
})
