import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../services/api'
import type { ApiComment } from '../types/api'
import ReviewComments from './ReviewComments'

vi.mock('../contexts/SessionContext', () => ({
  useSession: () => ({ user: { id: 1, username: 'ana', email: 'ana@example.com' } }),
}))

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  getReviewComments: vi.fn(),
  postComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}))

const at = new Date().toISOString()
const fromBia: ApiComment = { id: 1, review_id: 5, user_id: 2, username: 'bia', avatar_url: null, text: 'Concordo demais.', created_at: at, updated_at: at }
const fromAna: ApiComment = { ...fromBia, id: 2, user_id: 1, username: 'ana', text: 'Valeu!' }

const renderComments = (count = 2) => render(<MemoryRouter><ReviewComments reviewId={5} initialCount={count} /></MemoryRouter>)

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe('ReviewComments', () => {
  it('loads comments on demand, only lets the author edit and has no axe violations', async () => {
    vi.mocked(api.getReviewComments).mockResolvedValue([fromBia, fromAna])
    const { container } = renderComments()
    const toggle = screen.getByRole('button', { name: '2 comentários' })
    expect(api.getReviewComments).not.toHaveBeenCalled()

    await userEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(await screen.findByText('Concordo demais.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'bia' })).toHaveProperty('pathname', '/profile/bia')
    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(1)
    const { violations } = await axe.run(container)
    expect(violations.map((v) => v.id)).toEqual([])
  })

  it('posts a trimmed comment and updates the count', async () => {
    vi.mocked(api.getReviewComments).mockResolvedValue([])
    vi.mocked(api.postComment).mockResolvedValue({ ...fromAna, id: 9, text: 'Que disco.' })
    renderComments(0)
    await userEvent.click(screen.getByRole('button', { name: 'Comentar' }))
    expect(await screen.findByText('Nenhum comentário ainda.')).toBeTruthy()

    await userEvent.type(screen.getByLabelText('Seu comentário'), '  Que disco.  ')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar comentário' }))
    expect(api.postComment).toHaveBeenCalledWith(5, 'Que disco.')
    expect(await screen.findByText('Que disco.')).toBeTruthy()
    expect(screen.getByRole('button', { name: '1 comentário' })).toBeTruthy()
  })

  it('shows an error with retry when loading fails', async () => {
    vi.mocked(api.getReviewComments).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([fromBia])
    renderComments()
    await userEvent.click(screen.getByRole('button', { name: '2 comentários' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Concordo demais.')).toBeTruthy()
  })

  it('deletes an own comment after confirmation', async () => {
    vi.mocked(api.getReviewComments).mockResolvedValue([fromAna])
    vi.mocked(api.deleteComment).mockResolvedValue(undefined)
    renderComments(1)
    await userEvent.click(screen.getByRole('button', { name: '1 comentário' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }))
    expect(api.deleteComment).toHaveBeenCalledWith(2)
    expect(await screen.findByText('Nenhum comentário ainda.')).toBeTruthy()
  })
})
