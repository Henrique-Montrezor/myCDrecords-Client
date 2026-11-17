import { Disc3, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import { useResource } from '../hooks/useResource'
import { formatRecommendationReason } from '../lib/format'
import { getRecommendations } from '../services/api'
import type { Album, RecommendationKind } from '../types/api'
import ErrorBox from './ErrorBox'
import AlbumCard from './AlbumCard'
import RecommendationPilotPanel from './RecommendationPilotPanel'
import RecommendationModelControl, { RecommendationModelStatus } from './RecommendationModelControl'

// Below this many reviews the suggestions are still generic.
const REVIEWS_FOR_TASTE = 3

const eyebrows: Record<RecommendationKind, string> = {
  personalizada: 'PELO SEU GOSTO',
  popular: 'BEM AVALIADOS PELA COMUNIDADE',
  vazio: 'CONHEÇA NOVOS DISCOS',
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

export default function HomeRecommendations({ layout = 'home' }: { layout?: 'home' | 'shelf' }) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { user } = useSession()
  const { resource, reload } = useResource((signal) => getRecommendations(signal, 6), 'home-recommendations')

  const data = resource.status === 'ready' ? resource.data : null
  const kind = data?.kind ?? 'popular'
  const reason = data?.ml?.status === 'active' ? 'Afinidades do modelo experimental aplicadas ao seu perfil.' : reasons[kind]
  const hasSignals = data ? data.profile.reviews > 0 || data.profile.favorites > 0 || data.ml?.status === 'active' : true
  const needsMoreReviews = data !== null && hasSignals && data.kind !== 'personalizada' && data.profile.reviews < REVIEWS_FOR_TASTE

  if (layout === 'shelf') {
    if (data && data.albums.length === 0) return <p className="sr-only" role="status">Ainda não há sugestões. Explore os discos e avalie suas escutas para ajudar nas próximas recomendações.</p>
    return <section className="discovery-recommendations" aria-labelledby="discovery-recs-title" aria-busy={resource.status === 'loading'}>
      <h2 id="discovery-recs-title">{kind === 'popular' || kind === 'vazio' ? 'Da comunidade' : 'Para você'}</h2>
      <RecommendationModelStatus model={data?.ml} />
      {resource.status === 'loading' && <p className="loading-copy" role="status">Procurando sugestões...</p>}
      {resource.status === 'error' && <ErrorBox message="Não foi possível carregar as sugestões." onRetry={reload} />}
      {data && <><p className="rec-reason">{reason}</p>
        {data.albums.length <= 2
          ? <ul className="discovery-rec-compact">{data.albums.map((album) => <li key={album.id}><Link to={album.link}><span className="rec-cover"><RecCover album={album} /></span><div><h3>{album.title}</h3><span>{album.artist}</span></div></Link></li>)}</ul>
          : <div className="album-grid">{data.albums.map((album) => <AlbumCard key={album.id} album={album} />)}</div>}
      </>}
    </section>
  }

  return <section className="section home-recommendations" aria-labelledby="home-recs-title" aria-busy={resource.status === 'loading'}>
    <div className="section-heading">
      <div><p className="eyebrow">{eyebrows[kind]}</p><h2 id="home-recs-title" ref={headingRef} tabIndex={-1}>Para você</h2></div>
      {data && data.albums.length > 0 && <Link className="text-button" to="/recommendations">Ver todas</Link>}
    </div>
    {data && <RecommendationModelControl enabled={data.mlEnabled ?? false} onSaved={() => { headingRef.current?.focus(); reload() }} />}
    <RecommendationModelStatus model={data?.ml} />
    {resource.status === 'loading' && <p className="loading-copy" role="status">Procurando sugestões...</p>}
    {resource.status === 'error' && <ErrorBox message="Não foi possível carregar as sugestões." onRetry={reload} />}
    {data && <>
      {!hasSignals && <TasteInvite username={user?.username} />}
      {data.albums.length > 0 && <>
        {reason && <p className="rec-reason">{reason}</p>}
        <ol className="home-recommendation-row" aria-label="Álbuns recomendados">{data.albums.map((album) => <li key={album.id}>
          <AlbumCard album={album} />
          {album.reasons[0] && <p className="rec-why">{formatRecommendationReason(album.reasons[0])}</p>}
        </li>)}</ol>
      </>}
      {data.albums.length === 0 && hasSignals && <div className="empty-state"><p>Ainda não temos sugestões para você. Avalie mais álbuns para afinar o seu gosto.</p><Link className="secondary-button" to="/search"><Sparkles size={15} /> Explorar álbuns</Link></div>}
      {needsMoreReviews && data.albums.length > 0 && <p className="rec-nudge">Avalie mais discos para as sugestões ficarem mais certeiras. <Link to="/search">Buscar álbuns</Link></p>}
    </>}
    <RecommendationPilotPanel />
  </section>
}
