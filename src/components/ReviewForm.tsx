import { useState } from 'react'
import { ApiError, type ReviewInput } from '../services/api'
import RatingInput from './RatingInput'

const MAX_TEXT = 5000

type ReviewFormProps = {
  initial?: ReviewInput
  submitLabel: string
  onSubmit: (input: ReviewInput) => Promise<void>
  onCancel?: () => void
}

export default function ReviewForm({ initial, submitLabel, onSubmit, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(initial?.rating ?? 0)
  const [text, setText] = useState(initial?.text ?? '')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (rating < 1) {
      setError('Escolha uma nota de 1 a 5.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      await onSubmit({ rating, text: text.trim() })
    } catch (submissionError) {
      if (submissionError instanceof ApiError && submissionError.status === 409) setError('Você já avaliou este álbum.')
      else setError('Não foi possível salvar sua review. Tente novamente.')
      setIsSubmitting(false)
    }
  }

  return <form className="review-form" onSubmit={handleSubmit}>
    <RatingInput value={rating} onChange={setRating} disabled={isSubmitting} />
    <label>Review (opcional)
      <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={MAX_TEXT} rows={4} placeholder="O que você sentiu ao ouvir este disco?" disabled={isSubmitting} />
    </label>
    <div className="review-form-foot">
      <span>{text.length}/{MAX_TEXT}</span>
      <div>
        {onCancel && <button className="secondary-button" type="button" onClick={onCancel} disabled={isSubmitting}>Cancelar</button>}
        <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : submitLabel}</button>
      </div>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>
}
