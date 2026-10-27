import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../services/api'
import type { Album } from '../types/api'
import SearchPage from './SearchPage'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  searchAlbums: vi.fn(),
}))

const albums = (from: number, count: number): Album[] => Array.from({ length: count }, (_, index) => {
  const id = `a${from + index}`
  return { id, title: `Disco ${from + index}`, artist: 'Banda', year: '2020', cover: '', link: `/albums/${id}` }
})

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe('SearchPage album pagination', () => {
  it('loads the next page with an offset and hides the button at the end', async () => {
    vi.mocked(api.searchAlbums)
      .mockResolvedValueOnce(albums(0, api.ALBUM_SEARCH_PAGE_SIZE))
      .mockResolvedValueOnce(albums(api.ALBUM_SEARCH_PAGE_SIZE, 3))
    render(<MemoryRouter initialEntries={['/search?q=blue']}><SearchPage /></MemoryRouter>)

    await userEvent.click(await screen.findByRole('button', { name: 'Ver mais álbuns' }))
    expect(api.searchAlbums).toHaveBeenLastCalledWith('blue', undefined, api.ALBUM_SEARCH_PAGE_SIZE)
    expect(await screen.findByRole('heading', { name: `${api.ALBUM_SEARCH_PAGE_SIZE + 3} álbuns para “blue”` })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ver mais álbuns' })).toBeNull()
  })

  it('does not offer more results for a short first page', async () => {
    vi.mocked(api.searchAlbums).mockResolvedValueOnce(albums(0, 4))
    render(<MemoryRouter initialEntries={['/search?q=blue']}><SearchPage /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: '4 álbuns para “blue”' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ver mais álbuns' })).toBeNull()
  })
})
