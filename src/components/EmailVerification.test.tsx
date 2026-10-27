import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../services/api'
import EmailVerificationBanner from './EmailVerificationBanner'
import VerifyEmailScreen from './VerifyEmailScreen'

const session = vi.hoisted(() => ({
  user: { id: 1, username: 'ana', email: 'ana@example.com', emailVerified: false } as { id: number; username: string; email: string; emailVerified?: boolean },
  status: 'authenticated',
  markEmailVerified: vi.fn(),
}))

vi.mock('../contexts/SessionContext', () => ({ useSession: () => session }))

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  verifyEmail: vi.fn(),
  resendEmailVerification: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  session.user = { ...session.user, emailVerified: false }
})
afterEach(cleanup)

describe('VerifyEmailScreen', () => {
  it('verifies the token once, even under StrictMode', async () => {
    vi.mocked(api.verifyEmail).mockResolvedValue({ message: 'ok' })
    render(<StrictMode><MemoryRouter><VerifyEmailScreen token="abc" /></MemoryRouter></StrictMode>)
    expect(await screen.findByRole('heading', { name: 'Tudo certo por aqui.' })).toBeTruthy()
    expect(api.verifyEmail).toHaveBeenCalledTimes(1)
    expect(session.markEmailVerified).toHaveBeenCalled()
    expect(screen.getByRole('link', { name: /Ir para o início/ }).getAttribute('href')).toBe('/')
  })

  it('explains invalid or used links', async () => {
    vi.mocked(api.verifyEmail).mockRejectedValue(new Error('used'))
    render(<MemoryRouter><VerifyEmailScreen token="abc" /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Não foi possível confirmar.' })).toBeTruthy()
  })
})

describe('EmailVerificationBanner', () => {
  it('is hidden for verified or legacy users without the flag', () => {
    session.user = { ...session.user, emailVerified: true }
    const { container } = render(<EmailVerificationBanner />)
    expect(container.innerHTML).toBe('')
  })

  it('resends the link and confirms it', async () => {
    vi.mocked(api.resendEmailVerification).mockResolvedValue({ message: 'ok' })
    render(<EmailVerificationBanner />)
    await userEvent.click(screen.getByRole('button', { name: 'Reenviar link' }))
    expect(await screen.findByText(/Enviamos um novo link/)).toBeTruthy()
  })

  it('treats 409 as already verified', async () => {
    vi.mocked(api.resendEmailVerification).mockRejectedValue(new api.ApiError(409, { message: 'Email already verified' }))
    render(<EmailVerificationBanner />)
    await userEvent.click(screen.getByRole('button', { name: 'Reenviar link' }))
    expect(session.markEmailVerified).toHaveBeenCalled()
  })
})
