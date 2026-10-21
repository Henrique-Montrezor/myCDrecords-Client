import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RatingInput from './RatingInput'

afterEach(cleanup)

describe('RatingInput', () => {
  it('has no axe violations', async () => {
    const { container } = render(<RatingInput value={3} onChange={() => {}} />)
    const { violations } = await axe.run(container)
    expect(violations.map((v) => v.id)).toEqual([])
  })

  it('moves the rating with the keyboard', async () => {
    const onChange = vi.fn()
    render(<RatingInput value={3} onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: '3 estrelas' }))
    onChange.mockClear()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith(4)
  })
})
