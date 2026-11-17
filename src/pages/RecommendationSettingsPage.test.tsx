import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as api from '../services/api'
import type { RecommendationEnginePreference } from '../types/api'
import RecommendationSettingsPage from './RecommendationSettingsPage'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  getRecommendationEngine: vi.fn(),
  saveRecommendationEngine: vi.fn(),
}))

const renderPage = () => render(<MemoryRouter><RecommendationSettingsPage /></MemoryRouter>)
const checkbox = () => screen.getByRole('checkbox', { name: 'Usar ML experimental no meu feed' })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.getRecommendationEngine).mockResolvedValue({ enabled: true })
  vi.mocked(api.saveRecommendationEngine).mockImplementation(async (enabled) => ({ enabled }))
})
afterEach(cleanup)

it('shows the saved choice and confirms changes only after storage succeeds', async () => {
  let confirm: ((value: RecommendationEnginePreference) => void) | undefined
  vi.mocked(api.saveRecommendationEngine).mockReturnValueOnce(new Promise((resolve) => { confirm = resolve }))
  const view = renderPage()
  await screen.findByRole('checkbox')
  expect(checkbox()).toHaveProperty('checked', true)
  await userEvent.click(checkbox())
  expect(checkbox()).toHaveProperty('disabled', true)
  expect(checkbox()).toHaveProperty('checked', true)
  await act(async () => confirm?.({ enabled: false }))
  await waitFor(() => expect(checkbox()).toHaveProperty('checked', false))
  expect(api.saveRecommendationEngine).toHaveBeenCalledWith(false)
  expect(await screen.findByText('Escolha salva na sua conta.')).toBeTruthy()
  await userEvent.click(checkbox())
  await waitFor(() => expect(checkbox()).toHaveProperty('checked', true))
  expect(api.saveRecommendationEngine).toHaveBeenLastCalledWith(true)
  expect((await axe.run(view.container)).violations).toEqual([])
})

it('retains the saved choice after a failed change and supports retry', async () => {
  vi.mocked(api.saveRecommendationEngine).mockRejectedValueOnce(new Error('offline'))
  renderPage()
  await screen.findByRole('checkbox')
  await userEvent.click(checkbox())
  expect(await screen.findByText(/Não foi possível salvar a escolha/)).toBeTruthy()
  expect(checkbox()).toHaveProperty('checked', true)
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await waitFor(() => expect(checkbox()).toHaveProperty('checked', false))
})

it('retries loading the saved setting without depending on inference availability', async () => {
  vi.mocked(api.getRecommendationEngine).mockRejectedValueOnce(new Error('offline'))
  renderPage()
  expect(await screen.findByText(/Não foi possível carregar a configuração/)).toBeTruthy()
  expect(screen.queryByRole('checkbox')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await screen.findByRole('checkbox')
  expect(checkbox()).toHaveProperty('checked', true)
  expect(api.saveRecommendationEngine).not.toHaveBeenCalled()
})
