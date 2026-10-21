import { ChevronRight, Disc3, RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AlbumCard from '../components/AlbumCard'
import { useSession } from '../contexts/SessionContext'
import { useResource } from '../hooks/useResource'
import { useTrendingAlbums } from '../hooks/useTrendingAlbums'
import { formatRelativeTime, initials } from '../lib/format'
import { getFeed, getRecommendations, isAbortError } from '../services/api'
import type { ApiFeedItem } from '../types/api'

type FeedState = { status: 'loading' | 'ready' | 'error'; items: ApiFeedItem[] }

const todayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

function Feed() {
  const [feed, setFeed] = useState<FeedState>({ status: 'loading', items: [] })
  const [attempt, setAttempt] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the request on retry.
  useEffect(() => {
    const controller = new AbortController()
    setFeed({ status: 'loading', items: [] })
    getFeed(1, controller.signal)
      .then((items) => setFeed({ status: 'ready', items }))
      .catch((error: unknown) => {
        if (!isAbortError(error)) setFeed({ status: 'error', items: [] })
      })
    return () => controller.abort()
  }, [attempt])

  if (feed.status === 'loading') return <p className="loading-copy" role="status">Carregando atividade...</p>
  if (feed.status === 'error') return <div className="empty-state" role="alert"><p>Não foi possível carregar a atividade.</p><button type="button" className="secondary-button" onClick={() => setAttempt((value) => value + 1)}><RotateCw size={16} /> Tentar novamente</button></div>
  if (feed.items.length === 0) return <div className="empty-state">Ainda não há atividade. Quando você seguir pessoas, as reviews delas aparecem aqui.</div>

  return <div className="activity-list">{feed.items.map((item) => <article className="activity-item" key={item.id}>
    <div className="avatar avatar--green" aria-hidden="true">{initials(item.username)}</div>
    <div className="activity-body">
      <p><strong><Link to={`/profile/${encodeURIComponent(item.username ?? '')}`}>{item.username}</Link></strong> <span>avaliou</span></p>
      <h3><Link to={`/albums/${encodeURIComponent(String(item.album_id))}`}>{item.album_title ?? 'Álbum'}</Link></h3>
      <p className="activity-meta">{item.album_artist} <span className="rating" role="img" aria-label={`Nota ${item.rating} de 5`}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span></p>
      {item.text && <p className="activity-text">{item.text}</p>}
      <time className="time" dateTime={item.created_at}>{formatRelativeTime(item.created_at)}</time>
    </div>
  </article>)}</div>
}

function Recommendations() {
  const { resource, reload } = useResource((signal) => getRecommendations(signal), 'recommendations')

  // Nothing to recommend yet on a fresh platform: keep the home quiet instead of showing an empty box.
  if (resource.status === 'ready' && resource.data.albums.length === 0) return null

  const eyebrow = resource.status === 'ready' && resource.data.kind === 'colaborativa' ? 'QUEM OUVE O QUE VOCÊ OUVE' : 'BEM AVALIADOS PELA COMUNIDADE'
  const title = resource.status === 'ready' && resource.data.kind === 'colaborativa' ? 'Sugestões para você' : 'Discos que a comunidade recomenda'

  return <section className="section" aria-busy={resource.status === 'loading'}>
    <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></div>
    {resource.status === 'loading' && <p className="loading-copy" role="status">Procurando sugestões...</p>}
    {resource.status === 'error' && <div className="empty-state" role="alert"><p>Não foi possível carregar as sugestões.</p><button type="button" className="secondary-button" onClick={reload}><RotateCw size={16} /> Tentar novamente</button></div>}
    {resource.status === 'ready' && <div className="album-row">{resource.data.albums.slice(0, 8).map((album) => <AlbumCard album={album} key={album.id} />)}</div>}
  </section>
}

export default function HomePage() {
  const { user } = useSession()
  const trending = useTrendingAlbums()
  const featured = trending.albums[0]

  return <>
    <section className="welcome-row"><div><p className="eyebrow">{todayFormat.format(new Date()).toUpperCase()}</p><h1>Olá, {user?.username}.<br /><em>O que vai tocar hoje?</em></h1></div></section>

    <section className="hero-feature" aria-label="Álbum em destaque">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="live-dot" /> Em destaque</div>
        <h2>{featured?.title ?? 'Descubra o próximo disco.'}</h2>
        <p>{featured ? `${featured.artist}, ${featured.year}.` : 'Busque álbuns e artistas para começar a sua coleção.'}</p>
        <Link className="hero-action" to={featured?.link ?? '/search'}>{featured ? 'Abrir álbum' : 'Explorar'} <ChevronRight size={16} /></Link>
      </div>
      <div className="hero-record" aria-hidden="true">
        <div className="hero-disc">{featured?.cover ? <img src={featured.cover} alt="" /> : <Disc3 size={96} />}</div>
        <div className="record-label">myCD<br /><span>{String(new Date().getFullYear()).slice(2)}</span></div>
      </div>
      <div className="hero-wave" />
    </section>

    <section className="section"><div className="section-heading"><div><p className="eyebrow">SUA VIZINHANÇA MUSICAL</p><h2>O que está acontecendo</h2></div></div><Feed /></section>

    <Recommendations />

    <section className="section">
      <div className="section-heading"><div><p className="eyebrow">DESCOBRIR</p><h2>Em alta este ano</h2></div><Link className="text-button" to="/search">Ver tudo <ChevronRight size={15} /></Link></div>
      {trending.status === 'loading' && <p className="loading-copy" role="status">Buscando novidades...</p>}
      {trending.status === 'error' && <div className="empty-state" role="alert"><p>Não foi possível carregar os álbuns agora.</p><button type="button" className="secondary-button" onClick={trending.reload}><RotateCw size={16} /> Tentar novamente</button></div>}
      {trending.albums.length > 0 && <div className="album-row">{trending.albums.slice(0, 8).map((album) => <AlbumCard album={album} key={album.id} />)}</div>}
    </section>
  </>
}
