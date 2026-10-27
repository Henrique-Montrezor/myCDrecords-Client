import { RotateCw, Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import { initials } from '../lib/format'
import { deleteReview, postReview, updateReview, type ReviewInput } from '../services/api'
import type { AlbumDetails, ApiReview, RatingSummary } from '../types/api'
import ReviewForm from './ReviewForm'
import ReviewComments from './ReviewComments'
import VoteButtons from './VoteButtons'

export type CommunityState = { status: 'loading' | 'error' | 'ready'; summary: RatingSummary | null; mine: ApiReview | null; reviews: ApiReview[]; page: number; hasMore: boolean }

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' })

function Stars({ rating }: { rating: number }) {
  return <span className="review-stars" role="img" aria-label={`Nota ${rating} de 5`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={12} fill={value <= rating ? 'currentColor' : 'none'} />)}</span>
}

type ReviewSectionProps = {
  album: AlbumDetails
  community: CommunityState
  loadingMore: boolean
  onReload: () => void
  onLoadMore: () => void
}

export default function ReviewSection({ album, community, loadingMore, onReload, onLoadMore }: ReviewSectionProps) {
  const { user } = useSession()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')
  const hasOwnReview = community.mine !== null
  const others = community.reviews.filter((review) => review.id !== community.mine?.id)
  const visibleReviews = community.mine ? [community.mine, ...others] : others

  async function create(input: ReviewInput) {
    await postReview(album, input)
    onReload()
  }

  async function edit(reviewId: number, input: ReviewInput) {
    await updateReview(reviewId, input)
    setEditingId(null)
    onReload()
  }

  async function remove(reviewId: number) {
    setActionError('')
    try {
      await deleteReview(reviewId)
      setConfirmingId(null)
      onReload()
    } catch {
      setActionError('Não foi possível excluir a review. Tente novamente.')
    }
  }

  return <div className="review-section">
    <div className="album-section-heading"><div><p className="eyebrow">COMUNIDADE</p><h2>O que estão dizendo</h2></div></div>
    {community.status === 'loading' && <p className="loading-copy" role="status">Carregando reviews...</p>}
    {community.status === 'error' && <div className="empty-state" role="alert"><p>Não foi possível carregar as reviews.</p><button type="button" className="secondary-button" onClick={onReload}><RotateCw size={16} /> Tentar novamente</button></div>}
    {community.status === 'ready' && !hasOwnReview && <ReviewForm submitLabel="Publicar review" onSubmit={create} />}
    {community.status === 'ready' && visibleReviews.length === 0 && <div className="empty-state">Nenhuma review por aqui ainda. Seja a primeira pessoa a avaliar.</div>}
    {actionError && <p className="form-error" role="alert">{actionError}</p>}
    {visibleReviews.length > 0 && <ul className="review-list">{visibleReviews.map((review) => {
      const isOwn = review.user_id === user?.id
      if (editingId === review.id) return <li className="review-item review-item--editing" key={review.id}><ReviewForm initial={{ rating: review.rating, text: review.text ?? '' }} submitLabel="Salvar alterações" onSubmit={(input) => edit(review.id, input)} onCancel={() => setEditingId(null)} /></li>
      return <li className="review-item" key={review.id}>
        <div className="avatar avatar--green" aria-hidden="true">{initials(review.username)}</div>
        <div>
          <div className="review-head"><strong>{isOwn ? `${review.username} (você)` : <Link to={`/profile/${encodeURIComponent(review.username ?? '')}`}>{review.username ?? 'Usuário'}</Link>}</strong><Stars rating={review.rating} /><time dateTime={review.created_at}>{dateFormat.format(new Date(review.created_at))}</time></div>
          {review.text && <p>{review.text}</p>}
          {!isOwn && <VoteButtons reviewId={review.id} score={review.score ?? 0} userVote={review.user_vote ?? null} />}
          {isOwn && <div className="review-actions">
            {confirmingId === review.id
              ? <><span>Excluir esta review?</span><button type="button" className="review-delete" onClick={() => void remove(review.id)}>Sim, excluir</button><button type="button" onClick={() => setConfirmingId(null)}>Cancelar</button></>
              : <><button type="button" onClick={() => { setEditingId(review.id); setActionError('') }}>Editar</button><button type="button" onClick={() => setConfirmingId(review.id)}>Excluir</button></>}
          </div>}
          <ReviewComments reviewId={review.id} initialCount={review.comment_count ?? 0} />
        </div>
      </li>
    })}</ul>}
    {community.hasMore && <button type="button" className="secondary-button review-more" onClick={onLoadMore} disabled={loadingMore}>{loadingMore ? 'Carregando...' : 'Ver mais reviews'}</button>}
  </div>
}
