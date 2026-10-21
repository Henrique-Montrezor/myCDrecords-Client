import { Star } from 'lucide-react'
import { useRef } from 'react'

const values = [1, 2, 3, 4, 5]

export default function RatingInput({ value, onChange, disabled = false }: { value: number; onChange: (value: number) => void; disabled?: boolean }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function move(next: number) {
    const clamped = Math.min(5, Math.max(1, next))
    onChange(clamped)
    refs.current[clamped - 1]?.focus()
  }

  function handleKey(event: React.KeyboardEvent, current: number) {
    const keys: Record<string, number> = { ArrowRight: current + 1, ArrowUp: current + 1, ArrowLeft: current - 1, ArrowDown: current - 1, Home: 1, End: 5 }
    if (!(event.key in keys)) return
    event.preventDefault()
    move(keys[event.key])
  }

  return <div className="rating-input" role="radiogroup" aria-label="Sua nota de 1 a 5">
    {values.map((star) =>
      // biome-ignore lint/a11y/useSemanticElements: styled star buttons implement the WAI-ARIA radio pattern with roving tabindex.
      <button
      type="button"
      role="radio"
      key={star}
      ref={(element) => { refs.current[star - 1] = element }}
      aria-checked={value === star}
      aria-label={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
      tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
      disabled={disabled}
      onClick={() => onChange(star)}
      onKeyDown={(event) => handleKey(event, star)}
    ><Star size={24} fill={star <= value ? 'currentColor' : 'none'} /></button>)}
  </div>
}
