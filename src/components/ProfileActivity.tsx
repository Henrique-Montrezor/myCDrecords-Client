import { Heart, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatRelativeTime } from '../lib/format'
import { getUserActivity, isAbortError } from '../services/api'
import type { ApiActivity } from '../types/api'
import ErrorBox from './ErrorBox'
import Stars from './Stars'

const PAGE_SIZE = 10

function ActivityItem({ item, username, isSelf }: { item: ApiActivity; username: string; isSelf: boolean }) {
  const albumPath = `/albums/${encodeURIComponent(String(item.album_id))}`
  const title = item.album_title ?? 'Álbum'
  const subject = isSelf ? 'Você' : username
  return <li className="activity-entry">
    <Link className="profile-review-cover" to={albumPath} aria-label={`Abrir ${title}`}>
      {item.album_image ? <img src={item.album_image} alt="" loading="lazy" /> : <span />}
    </Link>
    <div>
      <p className="activity-line">
        {item.type === 'like'
          ? <><Heart size={13} className="activity-icon" aria-hidden="true" /> <strong>{subject}</strong> curtiu a review de <strong>{item.author_username}</strong> sobre <Link to={albumPath}>{title}</Link></>
          : <><Star size={13} className="activity-icon" aria-hidden="true" /> <strong>{subject}</strong> avaliou <Link to={albumPath}>{title}</Link> <Stars rating={item.rating} /></>}
      </p>
      {item.album_artist && <p className="profile-review-meta">{item.album_artist}{item.type === 'like' && <Stars rating={item.rating} />}</p>}
      {item.text && <p className="profile-review-text">{item.text}</p>}
      <time className="time" dateTime={item.created_at}>{formatRelativeTime(item.created_at)}</time>
    </div>
  </li>
}

export default function ProfileActivity({ userId, username, isSelf }: { userId: number; username: string; isSelf: boolean }) {
  const [items, setItems] = useState<ApiActivity[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the request on retry.
  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    getUserActivity(userId, 1, controller.signal)
      .then((entries) => { setItems(entries); setPage(1); setHasMore(entries.length === PAGE_SIZE); setStatus('ready') })
      .catch((error: unknown) => { if (!isAbortError(error)) setStatus('error') })
    return () => controller.abort()
  }, [userId, attempt])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const entries = await getUserActivity(userId, page + 1)
      setItems((current) => [...current, ...entries])
      setPage((current) => current + 1)
      setHasMore(entries.length === PAGE_SIZE)
    } catch {
      setStatus('error')
    } finally {
      setLoadingMore(false)
    }
  }

  if (status === 'loading') return <p className="loading-copy" role="status">Carregando atividade...</p>
  if (status === 'error') return <ErrorBox message="Não foi possível carregar a atividade." onRetry={() => setAttempt((value) => value + 1)} />
  if (items.length === 0) return <div className="empty-state">{isSelf ? 'Sua atividade aparece aqui quando você avaliar ou curtir reviews.' : 'Nenhuma atividade por enquanto.'}</div>

  return <>
    <ul className="profile-reviews activity-feed">{items.map((item) => <ActivityItem key={`${item.type}-${item.review_id}`} item={item} username={username} isSelf={isSelf} />)}</ul>
    {hasMore && <button type="button" className="secondary-button review-more" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? 'Carregando...' : 'Ver mais atividade'}</button>}
  </>
}
