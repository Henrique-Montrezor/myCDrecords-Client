import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, expect, it, vi } from 'vitest'
import ListOrderControls from './ListOrderControls'

afterEach(cleanup)
it('allows moving to the previous page and a specific global position by keyboard', async () => {
  const move = vi.fn().mockResolvedValue(undefined)
  render(<ListOrderControls title="Disco" position={25} total={1000} busy={false} onMove={move} />)
  await userEvent.click(screen.getByRole('button', { name: 'Mover Disco para cima' }))
  expect(move).toHaveBeenCalledWith(24)
  const input = screen.getByRole('spinbutton', { name: 'Nova posição de Disco' })
  await userEvent.clear(input)
  await userEvent.type(input, '1000{Enter}')
  expect(move).toHaveBeenLastCalledWith(1000)
})

it('does not move beyond the ends or submit an invalid position', async () => {
  const move = vi.fn()
  render(<ListOrderControls title="Disco" position={1} total={2} busy={false} onMove={move} />)
  expect(screen.getByRole('button', { name: 'Mover Disco para cima' }).hasAttribute('disabled')).toBe(true)
  const input = screen.getByRole('spinbutton')
  await userEvent.clear(input)
  await userEvent.type(input, '3{Enter}')
  expect(move).not.toHaveBeenCalled()
})

it('provides named keyboard controls with no axe violations', async () => {
  const { container } = render(<ListOrderControls title="Disco" position={2} total={1000} busy={false} onMove={vi.fn()} />)
  expect((await axe.run(container)).violations.map((violation) => violation.id)).toEqual([])
})
