const relativeFormat = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function formatRelativeTime(isoDate: string, now = new Date()) {
  const seconds = Math.round((new Date(isoDate).getTime() - now.getTime()) / 1000)
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relativeFormat.format(Math.trunc(seconds / size), unit)
  }
  return 'agora'
}

export function initials(name: string | undefined) {
  return (name ?? '').trim().slice(0, 2).toUpperCase() || '?'
}

export function formatDuration(durationMs: number | null) {
  if (durationMs === null) return '—'
  const seconds = Math.floor(durationMs / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
