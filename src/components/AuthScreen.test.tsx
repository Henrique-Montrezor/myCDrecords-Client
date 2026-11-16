import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '../contexts/SessionContext'
import AuthScreen from './AuthScreen'

vi.mock('../contexts/SessionContext', () => ({ useSession: vi.fn() }))
const signIn = vi.fn()
const signUp = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useSession).mockReturnValue({
    user: null, avatarUrl: null, status: 'anonymous', signIn, signUp,
    signOut: vi.fn(), setAvatarUrl: vi.fn(), markEmailVerified: vi.fn(), retry: vi.fn(),
  })
})
afterEach(cleanup)

async function registrationForm() {
  const view = render(<MemoryRouter><AuthScreen /></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
  fireEvent.change(screen.getByLabelText('Nome de usuário'), { target: { value: 'synthetic-user' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'fixture@example.invalid' } })
  fireEvent.change(screen.getByLabelText('Senha', { exact: true }), { target: { value: 'synthetic-password' } })
  fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'synthetic-password' } })
  return view
}

describe('registration public-review notice', () => {
  it('starts unchecked, explains the limited scope and blocks submission without acknowledgement', async () => {
    await registrationForm()
    const notice = screen.getByRole('checkbox', { name: /Entendo que minhas reviews serão públicas/ })
    expect(notice).toHaveProperty('checked', false)
    expect(notice).toHaveProperty('required', true)
    expect(screen.getByText(/não autoriza o uso dos seus dados para treinamento de ML/)).toBeTruthy()
    fireEvent.submit(screen.getByRole('form', { name: 'Criar conta' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Confirme'))
    expect(signUp).not.toHaveBeenCalled()
  })

  it('submits the versioned notice only after an explicit selection and is accessible', async () => {
    const { container } = await registrationForm()
    await userEvent.click(screen.getByRole('checkbox'))
    expect((await axe.run(container)).violations.map((violation) => violation.id)).toEqual([])
    fireEvent.submit(screen.getByRole('form', { name: 'Criar conta' }))
    await waitFor(() => expect(signUp).toHaveBeenCalledWith(
      'synthetic-user', 'fixture@example.invalid', 'synthetic-password', 'synthetic-password',
      { accepted: true, version: 'public-reviews-v1' },
    ))
  })

  it('disables acknowledgement while sending and preserves it when registration fails for retry', async () => {
    let rejectRegistration: (error: Error) => void = () => {}
    signUp.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRegistration = reject }))
    await registrationForm()
    await userEvent.click(screen.getByRole('checkbox'))
    fireEvent.submit(screen.getByRole('form', { name: 'Criar conta' }))
    expect(screen.getByRole('checkbox')).toHaveProperty('disabled', true)
    rejectRegistration(new Error('Falha sintética de cadastro.'))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Falha sintética de cadastro.')
    expect(screen.getByRole('checkbox')).toHaveProperty('checked', true)
    expect(screen.getByRole('checkbox')).toHaveProperty('disabled', false)
    fireEvent.submit(screen.getByRole('form', { name: 'Criar conta' }))
    await waitFor(() => expect(signUp).toHaveBeenCalledTimes(2))
  })

  it('does not require the notice for login and resets it when switching registration modes', async () => {
    await registrationForm()
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.queryByRole('checkbox')).toBeNull()
    fireEvent.submit(screen.getByRole('form', { name: 'Entrar' }))
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('fixture@example.invalid', 'synthetic-password'))
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(screen.getByRole('checkbox')).toHaveProperty('checked', false)
  })
})
