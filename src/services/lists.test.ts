import { afterEach, expect, it, vi } from 'vitest'
import { exploreLists, getList, getListImage, moveListItem, removeListImage, setAccessToken, setListSaved, uploadListImage } from './api'

afterEach(() => { vi.unstubAllGlobals(); setAccessToken(null) })
const mbid = 'eb3ffc95-ea38-4dcc-8dd9-c06ce5763232'
const cover = `https://coverartarchive.org/release-group/${mbid}/front`
const fixture = { id: 2, user_id: 3, item_count: 1000, is_public: 1, is_saved: 0, save_count: 3 }

it('uses the shared client, preserves filters and normalizes booleans and permitted cover provenance', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    items: [{ ...fixture, previews: [
      { album_id: mbid, album_title: 'Disco', album_image: cover },
      { album_id: 'spotify-id', album_title: 'Outro', album_image: 'https://i.scdn.co/image/test' },
      { album_id: mbid, album_title: 'Desconhecido', album_image: 'https://unknown.example/cover.jpg' },
    ] }], mode: 'popular', page: 2, total: 21, totalPages: 2, pageSize: 20,
  }), { headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetch)
  const signal = new AbortController().signal
  const result = await exploreLists({ scope: 'friends', q: 'gótico', page: 2, sort: 'popular' }, signal)
  const url = new URL(fetch.mock.calls[0][0])
  expect(url.pathname).toBe('/api/lists/explore')
  expect(Object.fromEntries(url.searchParams)).toEqual({ scope: 'friends', q: 'gótico', page: '2', sort: 'popular' })
  expect(fetch.mock.calls[0][1]).toMatchObject({ signal, credentials: 'include' })
  expect(result.items[0]).toMatchObject({ item_count: 1000, is_public: true, is_saved: false, previews: [
    { album_image: cover }, { album_image: null }, { album_image: null },
  ] })
})

it('reads the requested detail page without replacing its global count', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...fixture, page: 42, pageSize: 24, totalPages: 42, items: [{ album_id: mbid, album_image: cover }] }), { headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetch)
  const result = await getList(2, undefined, 42)
  expect(new URL(fetch.mock.calls[0][0]).searchParams.get('page')).toBe('42')
  expect(result.item_count).toBe(1000)
  expect(result.items).toHaveLength(1)
  expect(result.totalPages).toBe(42)
})

it('sends idempotent saved mutations and preserves explicit API failures', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Lista privada.' }), { status: 403, headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetch)
  await setListSaved(2, true)
  await setListSaved(2, false)
  expect(fetch.mock.calls.map((call) => call[1].method)).toEqual(['PUT', 'DELETE'])
  await expect(setListSaved(2, true)).rejects.toMatchObject({ status: 403, message: 'Lista privada.' })
})

it('reads private image bytes through the shared authenticated request without URL tokens', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('jpeg', { headers: { 'content-type': 'image/jpeg' } }))
  vi.stubGlobal('fetch', fetch)
  setAccessToken('test-in-memory-token')
  const image = await getListImage(2, 'thumbnail')
  expect(image.size).toBe(4)
  const [url, options] = fetch.mock.calls[0]
  expect(new URL(url).pathname).toBe('/api/lists/2/images/thumbnail')
  expect(new URL(url).search).toBe('')
  expect(options.headers.get('Authorization')).toBe('Bearer test-in-memory-token')
  expect(options.cache).toBe('no-store')
})

it('sends image bytes and revisioned movement through the existing HTTP client', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ revision: 8, page: 42 }), { headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetch)
  const image = new Blob(['jpeg'], { type: 'image/jpeg' })
  await uploadListImage(2, 'banner', image)
  await removeListImage(2, 'banner')
  expect(await moveListItem(2, { revision: 7, itemId: 10, toPosition: 1000 })).toEqual({ revision: 8, page: 42 })
  expect(fetch.mock.calls[0][1].body).toBe(image)
  expect(fetch.mock.calls[0][1].headers.get('Content-Type')).toBe('image/jpeg')
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ revision: 7, itemId: 10, toPosition: 1000 })
})
