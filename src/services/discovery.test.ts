import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, discoverAlbums, getDiscoverySelection } from './api'

afterEach(() => vi.unstubAllGlobals())

describe('discoverAlbums', () => {
  it('uses the shared HTTP client and normalizes only catalog items', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      source: 'musicbrainz', updatedAt: '2026-10-29T12:00:00Z', total: 14, nextOffset: 12,
      items: [{ id: 'mbid', title: 'Disco de teste', artistCredit: [{ name: 'Banda de teste' }], releaseDate: '2025-01-01' }],
    }), { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    const result = await discoverAlbums({ genre: 'gothic rock', year: '2025', type: 'ep', offset: '0' }, signal)
    const [url, options] = fetch.mock.calls[0]
    expect(new URL(url).pathname).toBe('/api/albums/discover')
    expect(new URL(url).searchParams.get('genre')).toBe('gothic rock')
    expect(options).toMatchObject({ signal, credentials: 'include' })
    expect(result).toMatchObject({
      total: 14, nextOffset: 12, source: 'musicbrainz',
      albums: [{ id: 'mbid', title: 'Disco de teste', artist: 'Banda de teste', year: '2025', link: '/albums/mbid' }],
    })

  })

  it('does not send an empty genre and exposes API failure with request ID', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Catálogo indisponível' }), {
      status: 502, headers: { 'content-type': 'application/json', 'x-request-id': 'test-request' },
    }))
    vi.stubGlobal('fetch', fetch)
    await expect(discoverAlbums({ genre: '', year: '2025', type: 'album', offset: '0' })).rejects.toMatchObject({
      name: ApiError.name, status: 502, message: 'Catálogo indisponível', requestId: 'test-request',
    })
    expect(new URL(fetch.mock.calls[0][0]).searchParams.has('genre')).toBe(false)
  })
})

describe('getDiscoverySelection', () => {
  it('preserves editorial metadata and normalizes albums through the shared client', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      sectionId: 'editorial', kind: 'editorial', title: 'Escolhas da curadoria', source: 'mycdrecords',
      status: 'ready', revision: 3, updatedAt: '2026-10-29T12:00:00Z', curator: 'editora',
      items: [{ album: { id: 'mbid', title: 'Disco escolhido', artistCredit: [{ name: 'Banda' }], releaseDate: '2025' }, note: 'Motivo da escolha.' }],
    }), { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    const result = await getDiscoverySelection(signal)
    expect(new URL(fetch.mock.calls[0][0]).pathname).toBe('/api/albums/discover/selection')
    expect(fetch.mock.calls[0][1]).toMatchObject({ signal, credentials: 'include' })
    expect(result).toMatchObject({
      source: 'mycdrecords', revision: 3, curator: 'editora', status: 'ready',
      items: [{ album: { id: 'mbid', title: 'Disco escolhido', artist: 'Banda', year: '2025', link: '/albums/mbid' }, note: 'Motivo da escolha.' }],
    })
  })

  it('does not convert an unavailable selection into an empty one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Curadoria indisponível' }), { status: 503, headers: { 'content-type': 'application/json' } })))
    await expect(getDiscoverySelection()).rejects.toMatchObject({ status: 503, message: 'Curadoria indisponível' })
  })
})
