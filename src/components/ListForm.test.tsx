import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ListForm from './ListForm'

afterEach(cleanup)

describe('ListForm', () => {
  it('has no axe violations', async () => {
    const { container } = render(<ListForm submitLabel="Criar lista" onSubmit={async () => {}} />)
    const { violations } = await axe.run(container)
    expect(violations.map((v) => v.id)).toEqual([])
  })

  it('requires a title before submitting', async () => {
    const onSubmit = vi.fn(async () => {})
    render(<ListForm submitLabel="Criar lista" onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Nome da lista'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('Dê um nome à lista.')
  })

  it('submits trimmed values and the visibility flag', async () => {
    const onSubmit = vi.fn(async () => {})
    render(<ListForm submitLabel="Criar lista" onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Nome da lista'), '  Domingo  ')
    await userEvent.type(screen.getByLabelText('Descrição (opcional)'), 'Discos calmos ')
    await userEvent.click(screen.getByLabelText(/Lista pública/))
    await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }))
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Domingo', description: 'Discos calmos', isPublic: false })
  })

  it('shows a retry message when saving fails', async () => {
    const onSubmit = vi.fn(async () => { throw new Error('boom') })
    render(<ListForm submitLabel="Criar lista" onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Nome da lista'), 'Falha')
    await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível salvar a lista. Tente novamente.')
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Criar lista' }).disabled).toBe(false)
  })
})
