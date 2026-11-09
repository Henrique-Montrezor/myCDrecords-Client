import type { RecommendationReason } from '../types/api'

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

const tagList = (tags: string[]) => tags.length > 1 ? `${tags.slice(0, -1).join(', ')} e ${tags[tags.length - 1]}` : tags.join('')
const people = (count: number) => `${count} ${count === 1 ? 'pessoa' : 'pessoas'}`

export function formatRecommendationReason(reason: RecommendationReason) {
  switch (reason.type) {
    case 'tags': return `Pelas suas notas em ${tagList(reason.tags)}`
    case 'collaborative': return `Bem avaliado por ${people(reason.people)} com gosto próximo`
    case 'exploration': return `Para explorar: ${reason.tag}, vizinho de ${reason.from}`
    case 'community': return `Nota alta de ${people(reason.people)} da comunidade`
    case 'preferences': {
      const selected = [...reason.genres, ...reason.artists]
      return `Pelas suas preferências: ${tagList(selected)}`
    }
  }
}
