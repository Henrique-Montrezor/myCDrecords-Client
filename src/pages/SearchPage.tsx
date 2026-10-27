import { Disc3, RotateCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AlbumCard from '../components/AlbumCard'
import Avatar from '../components/Avatar'
import { useResource } from '../hooks/useResource'
import { useTrendingAlbums, type AlbumListState } from '../hooks/useTrendingAlbums'
import { formatDuration } from '../lib/format'
import { ALBUM_SEARCH_PAGE_SIZE, isAbortError, searchAlbums, searchArtists, searchTracks, searchUsers } from '../services/api'

type Tab = 'albums' | 'artists' | 'tracks' | 'people'

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'albums', label: 'Álbuns' },
  { id: 'artists', label: 'Artistas' },
  { id: 'tracks', label: 'Faixas' },
  { id: 'people', label: 'Pessoas' },
]

function parseTab(value: string | null): Tab {
  return value === 'artists' || value === 'tracks' || value === 'people' ? value : 'albums'
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="empty-state" role="alert"><p>{message}</p><button type="button" className="secondary-button" onClick={onRetry}><RotateCw size={16} /> Tentar novamente</button></div>
}

function PeopleResults({ query }: { query: string }) {
  const { resource, reload } = useResource((signal) => searchUsers(query, signal), query)

  if (query.length < 2) return <div className="empty-state">Digite pelo menos 2 letras para buscar pessoas.</div>
  if (resource.status === 'loading') return <p className="loading-copy" role="status">Buscando pessoas...</p>
  if (resource.status === 'error') return <ErrorBox message="Não foi possível buscar pessoas agora." onRetry={reload} />
  if (resource.data.length === 0) return <div className="empty-state">Ninguém encontrado para “{query}”.</div>
  return <ul className="people-list">{resource.data.map((person) => <li key={person.id}>
    <Link to={`/profile/${encodeURIComponent(person.username)}`}><Avatar url={person.avatar_url} name={person.username} /><strong>{person.username}</strong></Link>
  </li>)}</ul>
}

function ArtistResults({ query }: { query: string }) {
  const { resource, reload } = useResource((signal) => searchArtists(query, signal), query)

  if (resource.status === 'loading') return <p className="loading-copy" role="status">Buscando artistas...</p>
  if (resource.status === 'error') return <ErrorBox message="Não foi possível buscar artistas agora." onRetry={reload} />
  if (resource.data.length === 0) return <div className="empty-state">Nenhum artista encontrado para “{query}”.</div>
  return <ul className="people-list">{resource.data.map((artist) => {
    const meta = [artist.type, artist.country, artist.years].filter(Boolean).join(' · ')
    return <li key={artist.id}>
      <Link to={`/artists/${encodeURIComponent(artist.id)}`}>
        <Avatar name={artist.name} />
        <div><strong>{artist.name}</strong>{(meta || artist.disambiguation) && <span className="result-meta">{meta}{meta && artist.disambiguation ? ' · ' : ''}{artist.disambiguation}</span>}</div>
      </Link>
    </li>
  })}</ul>
}

function TrackResults({ query }: { query: string }) {
  const { resource, reload } = useResource((signal) => searchTracks(query, signal), query)

  if (resource.status === 'loading') return <p className="loading-copy" role="status">Buscando faixas... (pode levar alguns segundos)</p>
  if (resource.status === 'error') return <ErrorBox message="Não foi possível buscar faixas agora." onRetry={reload} />
  if (resource.data.length === 0) return <div className="empty-state">Nenhuma faixa encontrada para “{query}”.</div>
  return <ol className="track-list">{resource.data.map((track) => <li className="track-result" key={track.id}>
    <span className="track-result-cover" aria-hidden="true">{track.imageUrl ? <img src={track.imageUrl} alt="" loading="lazy" /> : <Disc3 size={20} />}</span>
    <div>
      <strong>{track.title}</strong>
      <span>{track.artist}{track.albumTitle && <> · {track.albumId ? <Link to={`/albums/${encodeURIComponent(track.albumId)}`}>{track.albumTitle}</Link> : track.albumTitle}</>}</span>
    </div>
    <span className="track-duration">{formatDuration(track.durationMs)}</span>
  </li>)}</ol>
}

function AlbumGrid({ status, albums, onRetry }: AlbumListState & { onRetry: () => void }) {
  return <>
    {status === 'error' && <ErrorBox message="Não foi possível carregar os álbuns agora." onRetry={onRetry} />}
    {status === 'ready' && albums.length === 0 && <div className="empty-state">Nada por aqui ainda. Tente outro artista ou álbum.</div>}
    {albums.length > 0 && <div className={status === 'loading' ? 'album-grid album-grid--stale' : 'album-grid'}>{albums.map((album) => <AlbumCard album={album} key={album.id} />)}</div>}
  </>
}

function TrendingResults() {
  const trending = useTrendingAlbums()
  return <div aria-busy={trending.status === 'loading'}>
    <div className="section-heading"><div><p className="eyebrow">DESCOBRIR</p><h1 className="page-title">Em alta este ano</h1></div></div>
    <AlbumGrid {...trending} onRetry={trending.reload} />
  </div>
}

function AlbumResults({ query }: { query: string }) {
  const [results, setResults] = useState<AlbumListState>({ status: 'loading', albums: [] })
  const [attempt, setAttempt] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState(false)
  const [nextOffset, setNextOffset] = useState(ALBUM_SEARCH_PAGE_SIZE)
  const currentQuery = useRef(query)
  currentQuery.current = query

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the request on retry.
  useEffect(() => {
    const controller = new AbortController()
    // Keep the previous results visible (dimmed) while the new query loads.
    setResults((current) => ({ ...current, status: 'loading' }))
    setMoreError(false)
    searchAlbums(query, controller.signal)
      .then((albums) => {
        setResults({ status: 'ready', albums })
        setHasMore(albums.length >= ALBUM_SEARCH_PAGE_SIZE)
        setNextOffset(ALBUM_SEARCH_PAGE_SIZE)
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) setResults({ status: 'error', albums: [] })
      })
    return () => controller.abort()
  }, [query, attempt])

  async function loadMore() {
    setLoadingMore(true)
    setMoreError(false)
    try {
      const next = await searchAlbums(query, undefined, nextOffset)
      if (currentQuery.current !== query) return
      const known = new Set(results.albums.map((album) => album.id))
      const fresh = next.filter((album) => !known.has(album.id))
      setResults((current) => ({ ...current, albums: [...current.albums, ...fresh] }))
      setNextOffset(nextOffset + ALBUM_SEARCH_PAGE_SIZE)
      setHasMore(next.length >= ALBUM_SEARCH_PAGE_SIZE && fresh.length > 0)
    } catch {
      setMoreError(true)
    } finally {
      setLoadingMore(false)
    }
  }

  const { status, albums } = results
  const heading = status === 'loading' ? 'Buscando álbuns...' : `${albums.length} ${albums.length === 1 ? 'álbum' : 'álbuns'} para “${query}”`

  return <div aria-busy={status === 'loading'}>
    <div className="section-heading"><div><p className="eyebrow">RESULTADOS</p><h1 className="page-title" aria-live="polite">{heading}</h1></div></div>
    <AlbumGrid status={status} albums={albums} onRetry={() => setAttempt((value) => value + 1)} />
    {status === 'ready' && moreError && <p className="form-error" role="alert">Não foi possível carregar mais álbuns. Tente novamente.</p>}
    {status === 'ready' && hasMore && <button type="button" className="secondary-button review-more" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? 'Carregando...' : 'Ver mais álbuns'}</button>}
  </div>
}

const headings: Record<Exclude<Tab, 'albums'>, { eyebrow: string; title: (query: string) => string }> = {
  artists: { eyebrow: 'ARTISTAS', title: (query) => `Artistas para “${query}”` },
  tracks: { eyebrow: 'FAIXAS', title: (query) => `Faixas para “${query}”` },
  people: { eyebrow: 'PESSOAS', title: (query) => `Perfis para “${query}”` },
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = (params.get('q') ?? '').trim()
  const tab = query ? parseTab(params.get('tab')) : 'albums'

  function selectTab(next: Tab) {
    const nextParams = new URLSearchParams(params)
    if (next === 'albums') nextParams.delete('tab')
    else nextParams.set('tab', next)
    setParams(nextParams, { replace: true })
  }

  return <section className="search-results">
    {query && <div className="profile-tabs" role="tablist" aria-label="Tipo de resultado">
      {tabs.map(({ id, label }) => <button type="button" key={id} role="tab" id={`search-tab-${id}`} aria-selected={tab === id} aria-controls="search-panel" className={tab === id ? 'profile-tab profile-tab--active' : 'profile-tab'} onClick={() => selectTab(id)}>{label}</button>)}
    </div>}
    {!query ? <TrendingResults /> : <div id="search-panel" role="tabpanel" aria-labelledby={`search-tab-${tab}`}>
      {tab === 'albums' ? <AlbumResults query={query} /> : <>
        <div className="section-heading"><div><p className="eyebrow">{headings[tab].eyebrow}</p><h1 className="page-title">{headings[tab].title(query)}</h1></div></div>
        {tab === 'artists' && <ArtistResults query={query} />}
        {tab === 'tracks' && <TrackResults query={query} />}
        {tab === 'people' && <PeopleResults query={query} />}
      </>}
    </div>}
  </section>
}
