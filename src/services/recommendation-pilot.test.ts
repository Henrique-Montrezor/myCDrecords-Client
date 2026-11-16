import { afterEach, expect, it, vi } from 'vitest'
import { ApiError, joinRecommendationPilot, setAccessToken, withdrawRecommendationPilot } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
  setAccessToken(null)
})

it('sends only explicit acceptance/current version and withdraws without a user ID or body', async () => {
  const fetchMock = vi.fn().mockImplementation(async (_url, options: RequestInit) => new Response(JSON.stringify({
    participating: options.method === 'PUT', noticeVersion: 'ml-pilot-v2',
  }), { status: 200, headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)
  setAccessToken('synthetic-only')
  await joinRecommendationPilot('ml-pilot-v2')
  await withdrawRecommendationPilot()
  const [url, put] = fetchMock.mock.calls[0]
  expect(url).toMatch(/\/recommendations\/pilot\/participation$/)
  expect(JSON.parse(put.body)).toEqual({ accepted: true, noticeVersion: 'ml-pilot-v2' })
  expect(put.headers.get('Authorization')).toBe('Bearer synthetic-only')
  const [, remove] = fetchMock.mock.calls[1]
  expect(remove.method).toBe('DELETE')
  expect(remove.body).toBeUndefined()
})

it('propagates rejected consent instead of inventing a successful enrollment', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'ML_PILOT_BLOCKED' }), {
    status: 503, headers: { 'content-type': 'application/json' },
  })))
  await expect(joinRecommendationPilot('ml-pilot-v2')).rejects.toBeInstanceOf(ApiError)
})
