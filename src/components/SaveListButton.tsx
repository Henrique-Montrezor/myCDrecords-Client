import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useState } from 'react'
import { setListSaved } from '../services/api'

export default function SaveListButton({ listId, title, initialSaved, onSaved }: { listId: number; title: string; initialSaved: boolean; onSaved?: (saved: boolean) => void }) {
  const [saved, setSaved] = useState(initialSaved)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function toggle() {
    const next = !saved
    setPending(true)
    setError('')
    setSaved(next)
    try {
      await setListSaved(listId, next)
      onSaved?.(next)
    } catch {
      setSaved(!next)
      setError('Não foi possível atualizar o salvo. Tente novamente.')
    } finally {
      setPending(false)
    }
  }
  return <div className="save-list-action">
    <button type="button" className="secondary-button" disabled={pending} aria-pressed={saved} aria-label={`${saved ? 'Remover dos salvos' : 'Salvar'} ${title}`} onClick={() => void toggle()}>
      {saved ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}{saved ? 'Salva' : 'Salvar lista'}
    </button>
    <span className="sr-only" role="status">{pending ? 'Atualizando salvo...' : saved ? 'Lista salva.' : ''}</span>
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>
}
