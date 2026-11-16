import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRecommendationLab, setAccessToken } from './api'

afterEach(() => {
  setAccessToken(null)
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('getRecommendationLab', () => {
  it('uses the shared HTTP client without sending the real session to the isolated lab', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetch)
    setAccessToken('synthetic-session-test-token')
    const signal = new AbortController().signal
    await getRecommendationLab(signal)
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('http://localhost:3005/api/recommendations/lab')
    expect(options).toMatchObject({ signal, credentials: 'omit' })
    expect(options.headers.has('Authorization')).toBe(false)
  })

  it('refuses lab requests in production before accessing the network', async () => {
    vi.stubEnv('DEV', false)
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(getRecommendationLab()).rejects.toMatchObject({ status: 404 })
    expect(fetch).not.toHaveBeenCalled()
  })
})
