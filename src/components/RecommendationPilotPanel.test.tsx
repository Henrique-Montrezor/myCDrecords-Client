import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as api from '../services/api'
import RecommendationPilotPanel from './RecommendationPilotPanel'

vi.mock('../services/api', async (original) => ({
  ...(await original<typeof import('../services/api')>()),
  getRecommendationPilotNotice: vi.fn(),
  getRecommendationPilotParticipation: vi.fn(),
  joinRecommendationPilot: vi.fn(),
  withdrawRecommendationPilot: vi.fn(),
}))
const notice = {
  version: 'ml-pilot-v2', responsible: 'Responsável de teste', contact: 'fixture@example.invalid',
  purpose: 'Treinar recomendações locais.', text: 'Autorizo o uso opcional de novas notas.',
  data: 'Somente notas independentes.', retention: 'Eventos por 30 dias, treino em memória.',
  receipts: 'Comprovantes por 30 dias após retirada.', withdrawal: 'Retire pela API ou pelo contato.',
}
const participation = { invited: true, participating: false, closed: false, noticeVersion: null }
afterEach(cleanup)
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.getRecommendationPilotNotice).mockResolvedValue(notice)
  vi.mocked(api.getRecommendationPilotParticipation).mockResolvedValue(participation)
  vi.mocked(api.joinRecommendationPilot).mockResolvedValue({ participating: true, noticeVersion: notice.version })
  vi.mocked(api.withdrawRecommendationPilot).mockResolvedValue({ participating: false })
})
async function open() {
  await userEvent.click(screen.getByText('Piloto de recomendações com ML'))
}

it('loads only on demand and enrolls only after reading an unchecked explicit acknowledgement', async () => {
  render(<RecommendationPilotPanel />)
  expect(api.getRecommendationPilotNotice).not.toHaveBeenCalled()
  await open()
  const checkbox = await screen.findByRole('checkbox', { name: /Li o aviso e autorizo/ })
  expect((checkbox as HTMLInputElement).checked).toBe(false)
  expect(screen.getByText(notice.retention)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Participar do piloto' }) as HTMLButtonElement).disabled).toBe(true)
  await userEvent.click(checkbox)
  await userEvent.click(screen.getByRole('button', { name: 'Participar do piloto' }))
  expect(api.joinRecommendationPilot).toHaveBeenCalledWith(notice.version)
  expect(await screen.findByText(/Adesão confirmada/)).toBeTruthy()
  expect(await screen.findByRole('button', { name: 'Retirar autorização' })).toBeTruthy()
})

it.each([false, true])('does not present an enrollment form to non-invited or closed accounts (%s)', async (closed) => {
  vi.mocked(api.getRecommendationPilotParticipation).mockResolvedValue({ ...participation, invited: false, closed })
  render(<RecommendationPilotPanel />)
  await open()
  expect(await screen.findByText(closed ? /piloto foi encerrado/ : /restrito a contas convidadas/)).toBeTruthy()
  expect(screen.queryByRole('checkbox')).toBeNull()
  expect(api.joinRecommendationPilot).not.toHaveBeenCalled()
})

it('keeps withdrawal available while status collection is paused and offers retry', async () => {
  vi.mocked(api.getRecommendationPilotParticipation).mockRejectedValue(new api.ApiError(503, { code: 'ML_PILOT_BLOCKED' }))
  render(<RecommendationPilotPanel />)
  await open()
  expect(await screen.findByRole('alert')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Retirar autorização' }))
  expect(api.withdrawRecommendationPilot).toHaveBeenCalledOnce()
  expect(await screen.findByText(/Autorização retirada/)).toBeTruthy()
  vi.mocked(api.getRecommendationPilotParticipation).mockResolvedValue(participation)
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByRole('checkbox')).toBeTruthy()
})

it('reports failed enrollment without claiming participation', async () => {
  vi.mocked(api.joinRecommendationPilot).mockRejectedValue(new Error('fixture failure'))
  render(<RecommendationPilotPanel />)
  await open()
  await userEvent.click(await screen.findByRole('checkbox'))
  await userEvent.click(screen.getByRole('button', { name: 'Participar do piloto' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível registrar')
  expect(screen.queryByText(/Adesão confirmada/)).toBeNull()
})

it('keeps acknowledgement unselected after reopening and has no axe violations', async () => {
  const { container } = render(<RecommendationPilotPanel />)
  await open()
  await userEvent.click(await screen.findByRole('checkbox'))
  await open()
  await open()
  expect((await screen.findByRole('checkbox') as HTMLInputElement).checked).toBe(false)
  expect((await axe.run(container)).violations.map((violation) => violation.id)).toEqual([])
})
