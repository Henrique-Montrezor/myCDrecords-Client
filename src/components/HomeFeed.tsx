import { Disc3, ListMusic, Star, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import { formatRelativeTime } from '../lib/format'
import { getFeed, isAbortError } from '../services/api'
import type { ApiFeedItem, FeedScope } from '../types/api'
import Avatar from './Avatar'
import ErrorBox from './ErrorBox'
import Stars from './Stars'

const PAGE_SIZE = 10

const scopes: Array<{ id: FeedScope; label: string; hint: string }> = [
  { id: 'following', label: 'Quem eu sigo', hint: 'Reviews, listas e novos follows de quem você segue.' },
  { id: 'friends', label: 'Amigos', hint: 'Pessoas que você segue e que seguem você de volta.' },
]

type FeedState = { status: 'loading' | 'ready' | 'error'; items: ApiFeedItem[]; hasMore: boolean }

const entryKey = (item: ApiFeedItem) => `${item.type}-${item.id}`

function FeedCover({ src, title }: { src: string | null; title: string }) {
  const [failed, setFailed] = useState(false)
  return <span className="feed-cover">
    {src && !failed
      ? <img src={src} alt={`Capa de ${title}`} width={72} height={72} loading="lazy" onError={() => setFailed(true)} />
      : <span className="feed-cover-empty" aria-hidden="true"><Disc3 size={26} /></span>}
  </span>
}

function FeedEntry({ item, selfId }: { item: ApiFeedItem; selfId: number | undefined }) {
  const profilePath = `/profile/${encodeURIComponent(item.username)}`
  const author = <Link className="feed-name" to={profilePath}>{item.username}</Link>
  const time = <time className="time" dateTime={item.created_at}>{formatRelativeTime(item.created_at)}</time>

  return <li className="feed-entry">
    <Link to={profilePath} tabIndex={-1} aria-hidden="true"><Avatar url={item.avatar_url} name={item.username} size={38} /></Link>
    <div className="feed-main">
      {item.type === 'review' && <>
        <p className="feed-line"><Star size={13} className="activity-icon" aria-hidden="true" /> {author} avaliou</p>
        <div className="feed-card">
          <Link to={`/albums/${encodeURIComponent(item.album_id)}`} aria-label={`Abrir ${item.album_title ?? 'álbum'}`}><FeedCover src={item.album_image} title={item.album_title ?? 'álbum'} /></Link>
          <div className="feed-card-body">
            <h3><Link to={`/albums/${encodeURIComponent(item.album_id)}`}>{item.album_title ?? 'Álbum'}</Link></h3>
            <p className="feed-meta">{item.album_artist}<Stars rating={item.rating} /></p>
            {item.text && <p className="feed-text">{item.text}</p>}
          </div>
        </div>
      </>}
      {item.type === 'list' && <>
        <p className="feed-line"><ListMusic size={13} className="activity-icon" aria-hidden="true" /> {author} criou uma lista</p>
        <div className="feed-card">
          <Link to={`/lists/${item.list_id}`} aria-label={`Abrir a lista ${item.list_title}`}><FeedCover src={item.album_image} title={item.list_title} /></Link>
          <div className="feed-card-body">
            <h3><Link to={`/lists/${item.list_id}`}>{item.list_title}</Link></h3>
            <p className="feed-meta">{item.item_count} {item.item_count === 1 ? 'álbum' : 'álbuns'}</p>
            {item.text && <p className="feed-text">{item.text}</p>}
          </div>
        </div>
      </>}
      {item.type === 'follow' && <p className="feed-line">
        <UserPlus size={13} className="activity-icon" aria-hidden="true" /> {author} começou a seguir{' '}
        {item.target_id === selfId ? <strong>você</strong> : <Link className="feed-name" to={`/profile/${encodeURIComponent(item.target_username)}`}>{item.target_username}</Link>}
      </p>}
      {time}
    </div>
  </li>
}

function EmptyFeed({ scope }: { scope: FeedScope }) {
  return <div className="empty-state">
    {scope === 'friends'
      ? <p>Amigos são quem você segue e que segue você de volta. Quando houver um follow mútuo, a atividade aparece aqui.</p>
      : <p>Nada por aqui ainda. Siga pessoas para ver o que elas avaliam, listam e descobrem.</p>}
    <Link className="secondary-button" to="/search?tab=people">Encontrar pessoas</Link>
  </div>
}

export default function HomeFeed() {
  const { user } = useSession()
  const [scope, setScope] = useState<FeedScope>('following')
  const [feed, setFeed] = useState<FeedState>({ status: 'loading', items: [], hasMore: false })
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState(false)
  const moreController = useRef<AbortController | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the request on retry.
  useEffect(() => {
    const controller = new AbortController()
    setFeed({ status: 'loading', items: [], hasMore: false })
    setPage(1)
    setMoreError(false)
    setLoadingMore(false)
    getFeed(1, scope, controller.signal)
      .then((items) => setFeed({ status: 'ready', items, hasMore: items.length === PAGE_SIZE }))
      .catch((error: unknown) => {
        if (!isAbortError(error)) setFeed({ status: 'error', items: [], hasMore: false })
      })
    return () => {
      controller.abort()
      moreController.current?.abort()
    }
  }, [scope, attempt])

  async function loadMore() {
    const controller = new AbortController()
    moreController.current = controller
    setLoadingMore(true)
    setMoreError(false)
    try {
      const entries = await getFeed(page + 1, scope, controller.signal)
      // New activity shifts the pages, so drop entries already on screen.
      setFeed((current) => {
        const seen = new Set(current.items.map(entryKey))
        return { ...current, items: [...current.items, ...entries.filter((entry) => !seen.has(entryKey(entry)))], hasMore: entries.length === PAGE_SIZE }
      })
      setPage((current) => current + 1)
    } catch (error) {
      if (!isAbortError(error)) setMoreError(true)
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false)
    }
  }

  const current = scopes.find((entry) => entry.id === scope) ?? scopes[0]

  return <section className="section home-feed" aria-labelledby="home-feed-title">
    <div className="section-heading">
      <div><p className="eyebrow">SUA VIZINHANÇA MUSICAL</p><h2 id="home-feed-title">O que está acontecendo</h2></div>
    </div>
    <div className="profile-tabs" role="tablist" aria-label="Filtrar atividade">
      {scopes.map(({ id, label }) => <button type="button" key={id} role="tab" id={`feed-tab-${id}`} aria-selected={scope === id} aria-controls="home-feed-panel" className={scope === id ? 'profile-tab profile-tab--active' : 'profile-tab'} onClick={() => setScope(id)}>{label}</button>)}
    </div>
    <div id="home-feed-panel" role="tabpanel" aria-labelledby={`feed-tab-${scope}`} aria-busy={feed.status === 'loading'}>
      <p className="feed-hint">{current.hint}</p>
      {feed.status === 'loading' && <p className="loading-copy" role="status">Carregando atividade...</p>}
      {feed.status === 'error' && <ErrorBox message="Não foi possível carregar a atividade." onRetry={() => setAttempt((value) => value + 1)} />}
      {feed.status === 'ready' && feed.items.length === 0 && <EmptyFeed scope={scope} />}
      {feed.status === 'ready' && feed.items.length > 0 && <>
        <ul className="feed-list">{feed.items.map((item) => <FeedEntry key={entryKey(item)} item={item} selfId={user?.id} />)}</ul>
        {moreError && <p className="form-error review-more" role="alert">Não foi possível carregar mais atividade.</p>}
        {feed.hasMore && <button type="button" className="secondary-button review-more" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? 'Carregando...' : moreError ? 'Tentar novamente' : 'Ver mais atividade'}</button>}
      </>}
    </div>
  </section>
}
