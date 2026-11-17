import { afterEach, expect, it, vi } from 'vitest'
import { ApiError, getRecommendations, setAccessToken } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
  setAccessToken(null)
})

it('uses the saved account choice and preserves ML origin, status, reasons and pagination', async () => {
  const ml = { status: 'active', modelVersion: 'artist-bpr-fictional-v1', trainedOn: 'fictional-profiles', supportedArtists: ['The Cure'] }
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    tipo: 'personalizada', mlEnabled: true, ml, total: 3, nextOffset: 2, evidence: { signals: 1, required: 1 },
    data: [{ album_id: 'fixture', album_title: 'Fixture', album_artist: 'The Cure', reasons: [{ type: 'ml' }] }],
  }), { status: 200, headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)
  setAccessToken('fictional-token')
  const result = await getRecommendations(undefined, 1, 1)
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/recommendations\?limit=1&offset=1$/)
  expect(result.mlEnabled).toBe(true)
  expect(result.ml).toEqual(ml)
  expect(result.albums[0].reasons).toEqual([{ type: 'ml' }])
  expect(result.nextOffset).toBe(2)
})

it('surfaces an unavailable model instead of returning empty or fabricated recommendations', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'ML_UNAVAILABLE' }), {
    status: 503, headers: { 'content-type': 'application/json' },
  })))
  await expect(getRecommendations(undefined, 6, 0)).rejects.toBeInstanceOf(ApiError)
})
