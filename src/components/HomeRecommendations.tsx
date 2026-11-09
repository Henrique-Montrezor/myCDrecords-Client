import { Disc3, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import { useResource } from '../hooks/useResource'
import { formatRecommendationReason } from '../lib/format'
import { getRecommendations } from '../services/api'
import type { Album, RecommendationKind } from '../types/api'
import ErrorBox from './ErrorBox'
import AlbumCard from './AlbumCard'

// Below this many reviews the suggestions are still generic.
const REVIEWS_FOR_TASTE = 3

const copy: Record<RecommendationKind, { eyebrow: string; title: string }> = {
  personalizada: { eyebrow: 'PELO SEU GOSTO', title: 'Para você' },
  popular: { eyebrow: 'BEM AVALIADOS PELA COMUNIDADE', title: 'Para começar' },
  vazio: { eyebrow: 'CONHEÇA NOVOS DISCOS', title: 'Para você' },
}

const reasons: Record<RecommendationKind, string> = {
  personalizada: 'Escolhidos a partir das suas notas e favoritos.',
  popular: 'Os favoritos da comunidade, enquanto aprendemos o seu gosto.',
  vazio: '',
}

function RecCover({ album }: { album: Album }) {
  const [failed, setFailed] = useState(false)
  return album.cover && !failed
    ? <img src={album.cover} alt="" width={56} height={56} loading="lazy" onError={() => setFailed(true)} />
    : <span className="rec-cover-empty" aria-hidden="true"><Disc3 size={22} /></span>
}

function TasteInvite({ username }: { username: string | undefined }) {
  return <div className="taste-invite">
    <p className="taste-invite-title">Conte o que você ouve</p>
    <p>Ainda não temos sinais do seu gosto. Com algumas notas, as sugestões passam a ser só suas.</p>
    <div className="taste-invite-actions">
      <Link className="primary-button" to="/search">Avaliar álbuns</Link>
      {username && <Link className="secondary-button" to={`/profile/${encodeURIComponent(username)}`}>Escolher favoritos</Link>}
    </div>
  </div>
}

export default function HomeRecommendations({ layout = 'rail' }: { layout?: 'rail' | 'shelf' }) {
  const { user } = useSession()
  const { resource, reload } = useResource((signal) => getRecommendations(signal, 6), 'home-recommendations')

  const data = resource.status === 'ready' ? resource.data : null
  const kind = data?.kind ?? 'popular'
  const hasSignals = data ? data.profile.reviews > 0 || data.profile.favorites > 0 : true
  const needsMoreReviews = data !== null && hasSignals && data.kind !== 'personalizada' && data.profile.reviews < REVIEWS_FOR_TASTE

  if (layout === 'shelf') {
    if (data && data.albums.length === 0) return <p className="sr-only" role="status">Ainda não há sugestões. Explore os discos e avalie suas escutas para ajudar nas próximas recomendações.</p>
    return <section className="discovery-recommendations" aria-labelledby="discovery-recs-title" aria-busy={resource.status === 'loading'}>
      <h2 id="discovery-recs-title">{kind === 'popular' || kind === 'vazio' ? 'Da comunidade' : 'Para você'}</h2>
      {resource.status === 'loading' && <p className="loading-copy" role="status">Procurando sugestões...</p>}
      {resource.status === 'error' && <ErrorBox message="Não foi possível carregar as sugestões." onRetry={reload} />}
      {data && <><p className="rec-reason">{reasons[data.kind]}</p>
        {data.albums.length <= 2
          ? <ul className="discovery-rec-compact">{data.albums.map((album) => <li key={album.id}><Link to={album.link}><span className="rec-cover"><RecCover album={album} /></span><div><h3>{album.title}</h3><span>{album.artist}</span></div></Link></li>)}</ul>
          : <div className="album-grid">{data.albums.map((album) => <AlbumCard key={album.id} album={album} />)}</div>}
      </>}
    </section>
  }

  return <aside className="home-rail" aria-labelledby="home-recs-title" aria-busy={resource.status === 'loading'}>
    <div className="section-heading">
      <div><p className="eyebrow">{copy[kind].eyebrow}</p><h2 id="home-recs-title">{copy[kind].title}</h2></div>
      {data && data.albums.length > 0 && <Link className="text-button" to="/recommendations">Ver todas</Link>}
    </div>
    {resource.status === 'loading' && <p className="loading-copy" role="status">Procurando sugestões...</p>}
    {resource.status === 'error' && <ErrorBox message="Não foi possível carregar as sugestões." onRetry={reload} />}
    {data && <>
      {!hasSignals && <TasteInvite username={user?.username} />}
      {data.albums.length > 0 && <>
        {reasons[data.kind] && <p className="rec-reason">{reasons[data.kind]}</p>}
        <ol className="rec-list">{data.albums.map((album) => <li key={album.id}>
          <Link className="rec-item" to={album.link}>
            <span className="rec-cover"><RecCover album={album} /></span>
            <span className="rec-info"><strong>{album.title}</strong><span>{album.artist}</span>{album.reasons[0] && <span className="rec-why">{formatRecommendationReason(album.reasons[0])}</span>}</span>
          </Link>
        </li>)}</ol>
      </>}
      {data.albums.length === 0 && hasSignals && <div className="empty-state"><p>Ainda não temos sugestões para você. Avalie mais álbuns para afinar o seu gosto.</p><Link className="secondary-button" to="/search"><Sparkles size={15} /> Explorar álbuns</Link></div>}
      {needsMoreReviews && data.albums.length > 0 && <p className="rec-nudge">Avalie mais discos para as sugestões ficarem mais certeiras. <Link to="/search">Buscar álbuns</Link></p>}
    </>}
  </aside>
}
