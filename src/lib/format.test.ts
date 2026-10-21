import { describe, expect, it } from 'vitest'
import { formatDuration, formatRelativeTime, initials } from './format'

describe('format', () => {
  const now = new Date('2026-10-16T12:00:00Z')

  it('formats durations as m:ss and handles unknown values', () => {
    expect(formatDuration(225000)).toBe('3:45')
    expect(formatDuration(61000)).toBe('1:01')
    expect(formatDuration(null)).toBe('—')
  })

  it('formats past dates relative to now in pt-BR', () => {
    expect(formatRelativeTime('2026-10-16T11:30:00Z', now)).toBe('há 30 minutos')
    expect(formatRelativeTime('2026-10-14T12:00:00Z', now)).toBe('anteontem')
    expect(formatRelativeTime('2026-10-16T11:59:50Z', now)).toBe('agora')
  })

  it('builds initials with a fallback', () => {
    expect(initials('marina')).toBe('MA')
    expect(initials(undefined)).toBe('?')
  })
})
