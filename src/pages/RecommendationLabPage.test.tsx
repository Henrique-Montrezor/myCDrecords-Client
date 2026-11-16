import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getRecommendationLab } from '../services/api'
import type { RecommendationLabSnapshot } from '../types/api'
import RecommendationLabPage from './RecommendationLabPage'

vi.mock('../services/api', async (original) => ({ ...(await original<typeof import('../services/api')>()), getRecommendationLab: vi.fn() }))

const fixture: RecommendationLabSnapshot = {
  schemaVersion: 1, mode: 'synthetic', modelVersion: 'pytorch-bpr-v1', datasetVersion: 'synthetic-families-v1',
  snapshotId: 'a'.repeat(64), generatedAt: '2026-11-16T12:00:00.000Z',
  promotionAllowed: false, realWorldQuality: 'not_measured',
  training: { initialLoss: 0.7, finalLoss: 0.1, epochs: 200, seed: 42, torchVersion: '2.15.0+cpu' },
  evaluation: { protocol: 'synthetic-leave-one-out', k: 3, model: { recall: 1, ndcg: 1 }, baseline: { recall: 0.25, ndcg: 0.25 } },
  profiles: [1, 2].map((n) => ({
    id: `synthetic-user-0${n}`, trainingAlbums: ['synthetic-album-01', 'synthetic-album-02', 'synthetic-album-03'],
    heldOutAlbum: `synthetic-album-0${n + 5}`,
    recommendations: [{ albumId: `synthetic-album-0${n + 5}`, score: 0.8 }],
    baseline: [{ albumId: 'synthetic-album-04', score: 3 }],
  })),
}

const renderPage = (entry = '/recommendations/lab') => render(<MemoryRouter initialEntries={[entry]}><RecommendationLabPage /></MemoryRouter>)
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getRecommendationLab).mockResolvedValue(fixture)
})
afterEach(cleanup)

describe('RecommendationLabPage', () => {
  it('shows learned and baseline rankings, states the synthetic limits and has no axe violations', async () => {
    const { container } = renderPage()
    const ranking = await screen.findByRole('region', { name: 'Ranking PyTorch' })
    expect(within(ranking).getByText('Disco sintético 06')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Referência por popularidade' })).toBeTruthy()
    expect(screen.getByText(/Não mede a qualidade para usuários reais/)).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Disco sintético 06' })).toBeNull()
    expect((await axe.run(container)).violations.map((v) => v.id)).toEqual([])
  })

  it('changes synthetic profiles without writing favorites or reviews', async () => {
    renderPage()
    await screen.findByRole('combobox', { name: 'Perfil sintético' })
    await userEvent.selectOptions(screen.getByRole('combobox'), 'synthetic-user-02')
    expect(within(screen.getByRole('region', { name: 'Ranking PyTorch' })).getByText('Disco sintético 07')).toBeTruthy()
    expect(getRecommendationLab).toHaveBeenCalledTimes(1)
  })

  it('explains a missing model and retries', async () => {
    vi.mocked(getRecommendationLab).mockRejectedValueOnce(new ApiError(503, { code: 'ML_LAB_NOT_TRAINED', message: 'Nenhum treino disponível.' }))
    renderPage()
    expect(await screen.findByText(/Nenhum treino disponível/)).toBeTruthy()
    vi.mocked(getRecommendationLab).mockResolvedValue(fixture)
    await userEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }))
    expect(await screen.findByRole('region', { name: 'Ranking PyTorch' })).toBeTruthy()
  })

  it('shows unavailable without presenting it as an empty successful result', async () => {
    vi.mocked(getRecommendationLab).mockRejectedValueOnce(new ApiError(404, { message: 'Laboratório indisponível neste ambiente.' }))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Laboratório indisponível neste ambiente.'))
    expect(screen.queryByRole('region', { name: 'Ranking PyTorch' })).toBeNull()
  })

  it('announces loading and an empty candidate ranking', async () => {
    vi.mocked(getRecommendationLab).mockResolvedValue({
      ...fixture, profiles: [{ ...fixture.profiles[0], recommendations: [], baseline: [] }],
    })
    renderPage()
    expect(screen.getByRole('status').textContent).toContain('Carregando o treino')
    expect(await screen.findAllByText('Nenhum candidato neste ranking.')).toHaveLength(2)
  })

  it('does not silently replace an unknown profile in the URL', async () => {
    renderPage('/recommendations/lab?profile=unknown')
    expect(await screen.findByText('Perfil sintético não encontrado.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Selecionar primeiro perfil' }))
    expect(await screen.findByRole('region', { name: 'Ranking PyTorch' })).toBeTruthy()
  })
})
