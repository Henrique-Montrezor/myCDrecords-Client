import { useState } from 'react'
import { Disc3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import ErrorBox from '../components/ErrorBox'
import { useResource } from '../hooks/useResource'
import { getDismissedRecommendations, undoDismissRecommendation } from '../services/api'
import type { DismissedRecommendationsPage as Page, RecommendedAlbum } from '../types/api'

const PAGE_SIZE = 12

function Cover({ album }: { album: RecommendedAlbum }) {
  const [failed, setFailed] = useState(false)
  return album.cover && !failed
    ? <img src={album.cover} alt="" width={96} height={96} loading="lazy" onError={() => setFailed(true)} />
    : <span className="recs-cover-empty" aria-hidden="true"><Disc3 size={28} /></span>
}

export default function DismissedRecommendationsPage() {
  const { resource, reload, setResource } = useResource((signal) => getDismissedRecommendations(signal, PAGE_SIZE), 'dismissed-recommendations')
  const [pending, setPending] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreFailed, setMoreFailed] = useState(false)

  async function restore(album: RecommendedAlbum) {
    setPending(album.id)
    setNotice('')
    try {
      await undoDismissRecommendation(album.id)
      setResource((current) => current.status === 'ready' ? {
        status: 'ready',
        data: { ...current.data, albums: current.data.albums.filter((item) => item.id !== album.id), total: Math.max(0, current.data.total - 1) },
      } : current)
      setNotice(`“${album.title}” voltou às sugestões.`)
    } catch {
      setNotice(`Não foi possível restaurar “${album.title}”. Tente novamente.`)
    } finally {
      setPending(null)
    }
  }

  async function loadMore(page: Page) {
    setLoadingMore(true)
    setMoreFailed(false)
    try {
      const next = await getDismissedRecommendations(undefined, PAGE_SIZE, page.albums.length)
      setResource((current) => {
        if (current.status !== 'ready') return current
        const seen = new Set(current.data.albums.map((album) => album.id))
        return { status: 'ready', data: { ...current.data, albums: [...current.data.albums, ...next.albums.filter((album) => !seen.has(album.id))], total: next.total, nextOffset: next.nextOffset } }
      })
    } catch {
      setMoreFailed(true)
    } finally {
      setLoadingMore(false)
    }
  }

  const page = resource.status === 'ready' ? resource.data : null

  return <div className="recs-page">
    <p className="eyebrow">PREFERÊNCIAS</p>
    <h1 className="page-title">Discos dispensados</h1>
    <p className="recs-intro">Estes discos não aparecem nas suas sugestões enquanto estiverem nesta lista.</p>
    <div className="recs-tools"><Link className="secondary-button" to="/recommendations">Voltar às sugestões</Link></div>
    <div className="share-status" role="status">{notice}</div>
    {resource.status === 'loading' && <p className="loading-copy" role="status">Carregando discos dispensados...</p>}
    {resource.status === 'error' && <ErrorBox message="Não foi possível carregar os discos dispensados." onRetry={reload} />}
    {page && (page.albums.length === 0
      ? <div className="empty-state"><p>Você ainda não dispensou nenhum disco.</p></div>
      : <ol className="recs-index">{page.albums.map((album) => <li className="recs-entry" key={album.id}>
        <span className="recs-cover"><Cover album={album} /></span>
        <div className="recs-body">
          <h2><Link to={album.link}>{album.title}</Link></h2>
          <p className="recs-artist">{album.artist}{album.year && ` · ${album.year}`}</p>
        </div>
        <button type="button" className="secondary-button recs-dismiss" aria-label={`Voltar às sugestões: ${album.title}`} disabled={pending !== null} onClick={() => restore(album)}>
          {pending === album.id ? 'Restaurando...' : 'Voltar às sugestões'}
        </button>
      </li>)}</ol>)}
    {moreFailed && <ErrorBox message="Não foi possível carregar mais discos." onRetry={() => page && loadMore(page)} />}
    {page?.nextOffset !== null && page?.nextOffset !== undefined && !moreFailed && <button type="button" className="secondary-button recs-more" disabled={loadingMore} onClick={() => loadMore(page)}>{loadingMore ? 'Carregando...' : 'Ver mais discos'}</button>}
  </div>
}