import { useId, useState } from 'react'
import { ApiError, type ListInput } from '../services/api'

const MAX_TITLE = 255
const MAX_DESCRIPTION = 2000

type Props = {
  initial?: Partial<ListInput>
  submitLabel: string
  onSubmit: (input: ListInput) => Promise<void>
  onCancel?: () => void
  compact?: boolean
}

export default function ListForm({ initial, submitLabel, onSubmit, onCancel, compact = false }: Props) {
  const id = useId()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Dê um nome à lista.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      await onSubmit({ title: trimmed, description: description.trim(), isPublic })
    } catch (submissionError) {
      setError(submissionError instanceof ApiError && submissionError.status === 400 ? 'Confira o nome e a descrição da lista.' : 'Não foi possível salvar a lista. Tente novamente.')
      setIsSubmitting(false)
    }
  }

  return <form className={compact ? 'list-form list-form--compact' : 'list-form'} onSubmit={handleSubmit} aria-busy={isSubmitting}>
    <label htmlFor={`${id}-title`}>Nome da lista</label>
    <input id={`${id}-title`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={MAX_TITLE} placeholder="Discos para ouvir no domingo" disabled={isSubmitting} required aria-invalid={error ? true : undefined} />
    {!compact && <>
      <label htmlFor={`${id}-description`}>Descrição (opcional)</label>
      <textarea id={`${id}-description`} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={MAX_DESCRIPTION} placeholder="Do que é essa lista?" disabled={isSubmitting} />
    </>}
    <label className="list-form-check">
      <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} disabled={isSubmitting} />
      Lista pública (qualquer pessoa com o link pode ver)
    </label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="list-form-actions">
      {onCancel && <button type="button" className="secondary-button" onClick={onCancel} disabled={isSubmitting}>Cancelar</button>}
      <button type="submit" className="primary-button" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : submitLabel}</button>
    </div>
  </form>
}
