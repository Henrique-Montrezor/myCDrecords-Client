import { ArrowLeft, Disc3, ExternalLink, RotateCw, Share2, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AddToListButton from './components/AddToListButton'
import ReviewSection, { type CommunityState } from './components/ReviewSection'
import { formatDuration } from './lib/format'
import { ApiError, getAlbumById, getAlbumRatingSummary, getAlbumReviews, getMyAlbumReview, isAbortError } from './services/api'
import type { AlbumDetails, AlbumTrack, RatingSummary } from './types/api'

type DetailsState =
  | { status: 'loading' }
  | { status: 'error'; notFound: boolean }
  | { status: 'ready'; album: AlbumDetails }

const REVIEWS_PAGE_SIZE = 10
const albumTypeLabels: Record<string, string> = { album: 'Álbum', single: 'Single', ep: 'EP', compilation: 'Coletânea' }
const scoreFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' })

function formatRelease(releaseDate: string | null) {
  if (!releaseDate) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(releaseDate) ? dateFormat.format(new Date(`${releaseDate}T12:00:00`)) : releaseDate
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

function BackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  // `default` means the app was opened on this page, so there is no previous screen to return to.
  const goBack = () => {
    if (location.key === 'default') navigate('/')
    else navigate(-1)
  }
  return <button type="button" className="back-button" onClick={goBack}><ArrowLeft size={17} /> Voltar</button>
}

// Mounted with `key={src}` so a new cover resets the failed state.
function Cover({ src, title }: { src: string | null; title: string }) {
  const [failed, setFailed] = useState(false)

  return <div className="album-cover-stage">
    <span className="album-vinyl" aria-hidden="true" />
    {src && !failed
      ? <img className="album-detail-cover" src={src} alt={`Capa de ${title}`} onError={() => setFailed(true)} />
      : <div className="album-detail-cover album-detail-cover--empty" role="img" aria-label={`Capa indisponível para ${title}`}><Disc3 size={56} /></div>}
  </div>
}

function AlbumSkeleton() {
  return <div className="album-page-shell">
    <div className="album-page-topbar"><BackButton /></div>
    <main className="album-detail" role="status" aria-busy="true" aria-label="Carregando álbum">
      <section className="album-hero">
        <div className="skeleton skeleton--cover" />
        <div className="album-detail-copy"><div className="skeleton skeleton--line skeleton--wide" /><div className="skeleton skeleton--line" /><div className="skeleton skeleton--line skeleton--short" /></div>
      </section>
    </main>
  </div>
}

function TrackRows({ tracks, albumArtist }: { tracks: AlbumTrack[]; albumArtist: string }) {
  return <ol className="track-list">{tracks.map((track) => {
    const artists = track.artists.join(', ')
    return <li className="track-row" key={`${track.discNumber}-${track.number}-${track.id}`}>
      <span className="track-number">{String(track.number).padStart(2, '0')}</span>
      <div><strong>{track.title}</strong><span>{artists || albumArtist}</span></div>
      <span className="track-duration">{formatDuration(track.durationMs)}</span>
    </li>
  })}</ol>
}

function Distribution({ summary }: { summary: RatingSummary }) {
  return <ul className="rating-distribution" aria-label="Distribuição das avaliações">
    {([5, 4, 3, 2, 1] as const).map((value) => <li key={value}>
      <span>{value}</span>
      <span className="rating-bar"><span style={{ width: `${(summary.distribution[value] / summary.count) * 100}%` }} /></span>
      <span>{summary.distribution[value]}</span>
    </li>)}
  </ul>
}

export default function AlbumPage({ albumId }: { albumId: string }) {
  const [details, setDetails] = useState<DetailsState>({ status: 'loading' })
  const [community, setCommunity] = useState<CommunityState>({ status: 'loading', summary: null, mine: null, reviews: [], page: 1, hasMore: false })
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [communityAttempt, setCommunityAttempt] = useState(0)
  const [shareMessage, setShareMessage] = useState('')

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the request on "Tentar novamente".
  useEffect(() => {
    const controller = new AbortController()
    setDetails({ status: 'loading' })
    getAlbumById(albumId, controller.signal)
      .then((album) => setDetails({ status: 'ready', album }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        setDetails({ status: 'error', notFound: error instanceof ApiError && error.status === 404 })
      })
    return () => controller.abort()
  }, [albumId, attempt])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `communityAttempt` re-runs the request on retry.
  useEffect(() => {
    const controller = new AbortController()
    setCommunity({ status: 'loading', summary: null, mine: null, reviews: [], page: 1, hasMore: false })
    Promise.all([getAlbumRatingSummary(albumId, controller.signal), getMyAlbumReview(albumId, controller.signal), getAlbumReviews(albumId, 1, controller.signal)])
      .then(([summary, mine, reviews]) => setCommunity({ status: 'ready', summary, mine, reviews, page: 1, hasMore: reviews.length === REVIEWS_PAGE_SIZE }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        setCommunity({ status: 'error', summary: null, mine: null, reviews: [], page: 1, hasMore: false })
      })
    return () => controller.abort()
  }, [albumId, communityAttempt])

  const album = details.status === 'ready' ? details.album : null
  const artist = album?.artists.map((item) => item.name).join(', ') || 'Artista desconhecido'

  useEffect(() => {
    if (album) document.title = `${album.title} - ${artist} | myCDrecords`
    return () => { document.title = 'myCDrecords - sua escuta, seu arquivo' }
  }, [album, artist])

  useEffect(() => {
    if (!shareMessage) return
    const timeout = window.setTimeout(() => setShareMessage(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [shareMessage])

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: album?.title, url: window.location.href })
      else {
        await navigator.clipboard.writeText(window.location.href)
        setShareMessage('Link copiado.')
      }
    } catch (error) {
      if (isAbortError(error)) return
      setShareMessage('Não foi possível compartilhar.')
    }
  }

  async function loadMoreReviews() {
    setLoadingMore(true)
    try {
      const next = await getAlbumReviews(albumId, community.page + 1)
      setCommunity((current) => ({ ...current, reviews: [...current.reviews, ...next], page: current.page + 1, hasMore: next.length === REVIEWS_PAGE_SIZE }))
    } catch {
      setShareMessage('Não foi possível carregar mais reviews.')
    } finally {
      setLoadingMore(false)
    }
  }

  if (details.status === 'loading') return <AlbumSkeleton />
  if (details.status === 'error') return <div className="album-page-shell">
    <div className="album-page-topbar"><BackButton /></div>
    <main className="album-page-error">
      <h1>{details.notFound ? 'Álbum não encontrado.' : 'Não foi possível abrir este álbum.'}</h1>
      <p>{details.notFound ? 'Este disco não existe mais ou o link está incorreto.' : 'Confira sua conexão e tente novamente.'}</p>
      {details.notFound ? <Link className="secondary-button" to="/">Ir para o início</Link> : <button type="button" className="primary-button" onClick={() => setAttempt((value) => value + 1)}><RotateCw size={16} /> Tentar novamente</button>}
    </main>
  </div>

  const { tracks, genres, title } = details.album
  const release = formatRelease(details.album.releaseDate)
  const totalMs = tracks.length > 0 && tracks.every((track) => track.durationMs !== null) ? tracks.reduce((sum, track) => sum + (track.durationMs ?? 0), 0) : null
  const discs = [...new Set(tracks.map((track) => track.discNumber))].sort((a, b) => a - b)
  const { summary } = community
  const providerName = details.album.source === 'spotify' ? 'Spotify' : 'MusicBrainz'

  return <div className="album-page-shell">
    <div className="album-page-topbar"><BackButton /></div>
    <main className="album-detail">
      <section className="album-hero">
        <Cover key={details.album.coverUrl ?? ''} src={details.album.coverUrl} title={title} />
        <div className="album-detail-copy">
          <p className="eyebrow">PÁGINA DO ÁLBUM</p>
          <h1>{title}</h1>
          <p className="album-detail-artist">{artist}</p>
          <div className="album-meta">
            {release && <span>{details.album.releaseDate?.slice(0, 4)}</span>}
            {details.album.type && <span>{albumTypeLabels[details.album.type] ?? 'Álbum'}</span>}
            <span>{plural(details.album.totalTracks || tracks.length, 'faixa', 'faixas')}</span>
            {totalMs !== null && <span>{Math.max(1, Math.round(totalMs / 60000))} min</span>}
          </div>
          <div className="album-score">
            <Star size={18} fill="currentColor" />
            {community.status === 'ready' && summary?.average != null
              ? <><strong>{scoreFormat.format(summary.average)}</strong><span>{plural(summary.count, 'avaliação', 'avaliações')} da comunidade</span></>
              : <span>{community.status === 'loading' ? 'Carregando avaliações...' : community.status === 'error' ? 'Avaliações indisponíveis no momento' : 'Sem avaliações ainda'}</span>}
          </div>
          <div className="album-detail-buttons">
            {details.album.externalUrl && <a className="primary-button" href={details.album.externalUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> {details.album.source === 'spotify' ? 'Ouvir no Spotify' : 'Ver no MusicBrainz'}<span className="sr-only"> (abre em nova aba)</span></a>}
            <AddToListButton album={details.album} />
            <button type="button" className="secondary-button" onClick={share}><Share2 size={16} /> Compartilhar</button>
          </div>
          <p className="share-status" role="status">{shareMessage}</p>
        </div>
      </section>

      <section className="album-content-grid">
        <div>
          <div className="track-section">
            <div className="album-section-heading"><div><p className="eyebrow">FAIXAS</p><h2>O que toca neste disco</h2></div></div>
            {tracks.length === 0 && <div className="empty-state">As faixas deste álbum ainda não estão disponíveis em {providerName}.</div>}
            {discs.map((disc) => <div key={disc}>
              {discs.length > 1 && <h3 className="disc-heading">Disco {disc}</h3>}
              <TrackRows tracks={tracks.filter((track) => track.discNumber === disc)} albumArtist={artist} />
            </div>)}
          </div>

          <ReviewSection album={details.album} community={community} loadingMore={loadingMore} onReload={() => setCommunityAttempt((value) => value + 1)} onLoadMore={loadMoreReviews} />
        </div>

        <aside className="album-about">
          <p className="eyebrow">SOBRE O DISCO</p>
          <h2>Detalhes</h2>
          <dl>
            <div><dt>Artista</dt><dd>{artist}</dd></div>
            {genres.length > 0 && <div><dt>Gêneros</dt><dd>{genres.join(', ')}</dd></div>}
            {release && <div><dt>Lançamento</dt><dd>{release}</dd></div>}
            <div><dt>Fonte dos dados</dt><dd>{providerName}</dd></div>
          </dl>
          {summary && summary.count > 0 && <div className="album-ratings"><p className="eyebrow">AVALIAÇÕES</p><Distribution summary={summary} /></div>}
        </aside>
      </section>
    </main>
  </div>
}