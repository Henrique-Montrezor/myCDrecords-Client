import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, register, setAccessToken } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
  setAccessToken(null)
})

describe('registration acknowledgement HTTP contract', () => {
  it('sends explicit acknowledgement without inventing training consent or a client timestamp', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      accessToken: 'synthetic-only', expiresIn: 900, message: 'Synthetic account',
    }), { status: 201, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    await register('synthetic-user', 'fixture@example.invalid', 'synthetic-password', 'synthetic-password',
      { accepted: true, version: 'public-reviews-v1' })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/auth\/register$/)
    expect(JSON.parse(options.body)).toEqual({
      username: 'synthetic-user', email: 'fixture@example.invalid',
      password: 'synthetic-password', confirmPassword: 'synthetic-password',
      publicReviewNotice: { accepted: true, version: 'public-reviews-v1' },
    })
  })

  it('surfaces an incompatible notice response without retrying or claiming registration succeeded', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: 'O aviso mudou. Atualize a página.',
    }), { status: 400, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(register('synthetic-user', 'fixture@example.invalid', 'synthetic-password', 'synthetic-password',
      { accepted: true, version: 'public-reviews-v1' })).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
