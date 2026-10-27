import { MessageSquare, RotateCw } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import { COMMENTS_PAGE_SIZE, deleteComment, getReviewComments, isAbortError, postComment, updateComment } from '../services/api'
import type { ApiComment } from '../types/api'
import Avatar from './Avatar'

const MAX_TEXT = 1000
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' })
const countLabel = new Intl.PluralRules('pt-BR')

type LoadState = 'loading' | 'error' | 'ready'

export default function ReviewComments({ reviewId, initialCount = 0 }: { reviewId: number; initialCount?: number }) {
  const { user } = useSession()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<LoadState>('loading')
  const [comments, setComments] = useState<ApiComment[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [count, setCount] = useState(initialCount)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` is the explicit retry trigger.
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setStatus('loading')
    getReviewComments(reviewId, 1, controller.signal)
      .then((items) => {
        setComments(items)
        setPage(1)
        setHasMore(items.length === COMMENTS_PAGE_SIZE)
        setStatus('ready')
      })
      .catch((error) => { if (!isAbortError(error)) setStatus('error') })
    return () => controller.abort()
  }, [open, reviewId, attempt])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const items = await getReviewComments(reviewId, page + 1)
      setComments((current) => [...current, ...items.filter((item) => !current.some((existing) => existing.id === item.id))])
      setPage(page + 1)
      setHasMore(items.length === COMMENTS_PAGE_SIZE)
    } catch {
      setActionError('Não foi possível carregar mais comentários.')
    } finally {
      setLoadingMore(false)
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) {
      setFormError('Escreva um comentário antes de enviar.')
      return
    }
    setFormError('')
    setSending(true)
    try {
      const created = await postComment(reviewId, text)
      setComments((current) => [...current, created])
      setCount((value) => value + 1)
      setDraft('')
    } catch {
      setFormError('Não foi possível enviar o comentário. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  async function saveEdit(commentId: number) {
    const text = editText.trim()
    if (!text) return
    setActionError('')
    try {
      const updated = await updateComment(commentId, text)
      setComments((current) => current.map((item) => (item.id === commentId ? updated : item)))
      setEditingId(null)
    } catch {
      setActionError('Não foi possível salvar o comentário. Tente novamente.')
    }
  }

  async function remove(commentId: number) {
    setActionError('')
    try {
      await deleteComment(commentId)
      setComments((current) => current.filter((item) => item.id !== commentId))
      setCount((value) => Math.max(0, value - 1))
      setConfirmingId(null)
    } catch {
      setActionError('Não foi possível excluir o comentário. Tente novamente.')
    }
  }

  return <div className="review-comments">
    <button type="button" className="text-button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
      <MessageSquare size={14} aria-hidden="true" />
      {count > 0 ? `${count} ${countLabel.select(count) === 'one' ? 'comentário' : 'comentários'}` : 'Comentar'}
    </button>
    {open && <div id={panelId} className="comment-panel">
      {status === 'loading' && <p className="loading-copy" role="status">Carregando comentários...</p>}
      {status === 'error' && <div className="comment-error" role="alert"><span>Não foi possível carregar os comentários.</span><button type="button" className="text-button" onClick={() => setAttempt((value) => value + 1)}><RotateCw size={13} aria-hidden="true" /> Tentar novamente</button></div>}
      {status === 'ready' && comments.length === 0 && <p className="comment-empty">Nenhum comentário ainda.</p>}
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      {comments.length > 0 && <ul className="comment-list">{comments.map((comment) => {
        const isOwn = comment.user_id === user?.id
        return <li className="comment-item" key={comment.id}>
          <Avatar url={comment.avatar_url} name={comment.username} size={26} />
          <div>
            <div className="review-head"><strong>{isOwn ? `${comment.username} (você)` : <Link to={`/profile/${encodeURIComponent(comment.username)}`}>{comment.username}</Link>}</strong><time dateTime={comment.created_at}>{dateFormat.format(new Date(comment.created_at))}</time></div>
            {editingId === comment.id
              ? <form className="comment-form" onSubmit={(event) => { event.preventDefault(); void saveEdit(comment.id) }}>
                <label className="sr-only" htmlFor={`${panelId}-edit-${comment.id}`}>Editar comentário</label>
                <textarea id={`${panelId}-edit-${comment.id}`} value={editText} onChange={(event) => setEditText(event.target.value)} maxLength={MAX_TEXT} rows={2} />
                <div className="review-actions"><button type="submit" disabled={!editText.trim()}>Salvar</button><button type="button" onClick={() => setEditingId(null)}>Cancelar</button></div>
              </form>
              : <p>{comment.text}</p>}
            {isOwn && editingId !== comment.id && <div className="review-actions">
              {confirmingId === comment.id
                ? <><span>Excluir este comentário?</span><button type="button" className="review-delete" onClick={() => void remove(comment.id)}>Sim, excluir</button><button type="button" onClick={() => setConfirmingId(null)}>Cancelar</button></>
                : <><button type="button" onClick={() => { setEditingId(comment.id); setEditText(comment.text); setActionError('') }}>Editar</button><button type="button" onClick={() => setConfirmingId(comment.id)}>Excluir</button></>}
            </div>}
          </div>
        </li>
      })}</ul>}
      {hasMore && <button type="button" className="text-button" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? 'Carregando...' : 'Ver mais comentários'}</button>}
      {status === 'ready' && <form className="comment-form" onSubmit={submit}>
        <label htmlFor={`${panelId}-new`}>Seu comentário</label>
        <textarea id={`${panelId}-new`} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={MAX_TEXT} rows={2} disabled={sending} aria-describedby={`${panelId}-count`} />
        <div className="review-form-foot">
          <span id={`${panelId}-count`}>{draft.length}/{MAX_TEXT}</span>
          <button className="secondary-button" type="submit" disabled={sending}>{sending ? 'Enviando...' : 'Enviar comentário'}</button>
        </div>
        {formError && <p className="form-error" role="alert">{formError}</p>}
      </form>}
    </div>}
  </div>
}
