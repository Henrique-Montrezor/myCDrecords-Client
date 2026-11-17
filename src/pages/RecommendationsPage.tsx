import { Disc3 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorBox from '../components/ErrorBox'
import RecommendationPreferencesPanel from '../components/RecommendationPreferencesPanel'
import RecommendationPilotPanel from '../components/RecommendationPilotPanel'
import RecommendationModelControl, { RecommendationModelStatus } from '../components/RecommendationModelControl'
import { useResource } from '../hooks/useResource'
import { formatRecommendationReason } from '../lib/format'
import { dismissRecommendation, getRecommendations, undoDismissRecommendation } from '../services/api'
import type { RecommendationsPage as Page, RecommendedAlbum } from '../types/api'

const PAGE_SIZE = 12

type Dismissed = { album: RecommendedAlbum; index: number }

function Cover({ album }: { album: RecommendedAlbum }) {
  const [failed, setFailed] = useState(false)
  return album.cover && !failed
    ? <img src={album.cover} alt="" width={96} height={96} loading="lazy" onError={() => setFailed(true)} />
    : <span className="recs-cover-empty" aria-hidden="true"><Disc3 size={28} /></span>
}

function Intro({ page }: { page: Page }) {
  if (page.kind === 'personalizada') return <p className="recs-intro">Escolhidos pelas suas notas, favoritos e preferências. Cada disco diz o que pesou na escolha.</p>
  const missing = Math.max(page.evidence.required - page.evidence.signals, 0)
  if (missing === 0) return null
  return <div className="taste-invite">
    <p className="taste-invite-title">Ainda não são sugestões pelo seu gosto</p>
    <p>{page.kind === 'popular' ? 'Por enquanto mostramos discos bem avaliados pela comunidade. ' : ''}
      Adicione estilos ou artistas, ou dê nota 4 ou 5 a {missing === 1 ? 'mais 1 disco' : `mais ${missing} itens`} do catálogo para personalizar.</p>
    <div className="taste-invite-actions"><Link className="primary-button" to="/discover">Avaliar discos</Link></div>
  </div>
}

export default function RecommendationsPage() {
  const [generation, setGeneration] = useState(0)
  return <RecommendationsContent key={generation} focusHeading={generation > 0} onEngineSaved={() => setGeneration((value) => value + 1)} />
}

function RecommendationsContent({ focusHeading, onEngineSaved }: { focusHeading: boolean; onEngineSaved: () => void }) {
  const { resource, reload, setResource } = useResource((signal) => getRecommendations(signal, PAGE_SIZE), 'recommendations')
  const [pending, setPending] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; undo?: Dismissed } | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreFailed, setMoreFailed] = useState(false)
  const undoRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focusHeading) headingRef.current?.focus()
  }, [focusHeading])

  const update = (change: (page: Page) => Page) =>
    setResource((current) => current.status === 'ready' ? { status: 'ready', data: change(current.data) } : current)

  async function dismiss(album: RecommendedAlbum, index: number) {
    setPending(album.id)
    try {
      await dismissRecommendation(album.id)
      update((page) => ({ ...page, albums: page.albums.filter((item) => item.id !== album.id), total: page.total - 1 }))
      setNotice({ text: `“${album.title}” não será mais sugerido.`, undo: { album, index } })
      requestAnimationFrame(() => undoRef.current?.focus())
    } catch {
      setNotice({ text: `Não foi possível dispensar “${album.title}”. Tente novamente.` })
    } finally {
      setPending(null)
    }
  }

  async function undo({ album, index }: Dismissed) {
    setPending(album.id)
    try {
      await undoDismissRecommendation(album.id)
      update((page) => {
        const albums = page.albums.filter((item) => item.id !== album.id)
        albums.splice(Math.min(index, albums.length), 0, album)
        return { ...page, albums, total: page.total + 1 }
      })
      setNotice({ text: `“${album.title}” voltou às sugestões.` })
      requestAnimationFrame(() => headingRef.current?.focus())
    } catch {
      setNotice({ text: 'Não foi possível desfazer. Tente novamente.', undo: { album, index } })
    } finally {
      setPending(null)
    }
  }

  async function loadMore(page: Page) {
    setLoadingMore(true)
    setMoreFailed(false)
    try {
      // Offset by what is on screen: dismissals already shifted the server ranking.
      const next = await getRecommendations(undefined, PAGE_SIZE, page.albums.length)
      if ((next.mlEnabled ?? false) !== (page.mlEnabled ?? false)) {
        reload()
        return
      }
      update((current) => {
        const seen = new Set(current.albums.map((album) => album.id))
        return { ...current, albums: [...current.albums, ...next.albums.filter((album) => !seen.has(album.id))], total: next.total, nextOffset: next.nextOffset }
      })
    } catch {
      setMoreFailed(true)
    } finally {
      setLoadingMore(false)
    }
  }

  const page = resource.status === 'ready' ? resource.data : null
  const mlEnabled = page?.mlEnabled ?? false

  return <div className="recs-page">
    <h1 className="page-title" tabIndex={-1} ref={headingRef}>Para você</h1>
    <p className="recs-intro">{mlEnabled ? 'Sugestões experimentais pelas suas notas, favoritos e artistas escolhidos.' : 'Sugestões com base no que você avalia e nos estilos e artistas que escolher.'}</p>
    <div className="recs-tools">
      <Link className="secondary-button" to="/recommendations/dismissed">Rever dispensados</Link>
      <Link className="secondary-button" to="/settings/recommendations">Configurar recomendações</Link>
      {import.meta.env.DEV && <Link className="secondary-button" to="/recommendations/lab">Laboratório sintético</Link>}
    </div>
    {page && <RecommendationModelControl enabled={mlEnabled} onSaved={onEngineSaved} />}
    <RecommendationModelStatus model={page?.ml} />
    <RecommendationPreferencesPanel onSaved={reload} modelArtists={mlEnabled ? page?.ml?.supportedArtists ?? [] : undefined} />
    <RecommendationPilotPanel />
    {resource.status === 'loading' && <p className="loading-copy" role="status">Procurando sugestões...</p>}
    {resource.status === 'error' && <ErrorBox message="Não foi possível carregar as sugestões." onRetry={reload} />}
    <div className="share-status" role="status">
      {notice && <>{notice.text}{notice.undo && <> <button type="button" ref={undoRef} className="text-button" disabled={pending !== null} onClick={() => notice.undo && undo(notice.undo)}>Desfazer</button></>}</>}
    </div>
    {page && <>
      <Intro page={page} />
      {page.albums.length === 0
        ? <div className="empty-state"><p>Ainda não há discos para sugerir. Avalie o que você ouve em Descobrir e volte depois.</p><Link className="secondary-button" to="/discover">Ir para Descobrir</Link></div>
        : <ol className="recs-index">{page.albums.map((album, index) => <li className="recs-entry" key={album.id}>
          <span className="recs-cover"><Cover album={album} /></span>
          <div className="recs-body">
            <h2><Link to={album.link}>{album.title}</Link></h2>
            <p className="recs-artist">{album.artist}{album.year && ` · ${album.year}`}</p>
            {album.reasons.length > 0 && <ul className="recs-reasons" aria-label="Por que sugerimos">{album.reasons.map((reason) => <li key={reason.type}>{formatRecommendationReason(reason)}</li>)}</ul>}
          </div>
          <button type="button" className="secondary-button recs-dismiss" disabled={pending !== null} aria-label={`Não tenho interesse em ${album.title}`} onClick={() => dismiss(album, index)}>
            {pending === album.id ? 'Dispensando...' : 'Não tenho interesse'}
          </button>
        </li>)}</ol>}
      {moreFailed && <ErrorBox message="Não foi possível carregar mais sugestões." onRetry={() => loadMore(page)} />}
      {page.nextOffset !== null && !moreFailed && <button type="button" className="secondary-button recs-more" disabled={loadingMore} onClick={() => loadMore(page)}>{loadingMore ? 'Carregando...' : 'Ver mais sugestões'}</button>}
      <details className="recs-about">
        <summary>Como escolhemos</summary>
        {page.ml && <p>Artistas desta versão: {page.ml.supportedArtists.join(' · ')}. Nomes não listados e preferências só de estilos ainda não alimentam este modelo.</p>}
        {page.ml?.status === 'active'
          ? <p>O PyTorch aprendeu afinidades simuladas entre 24 artistas. Combinamos seus vetores com suas notas 4 e 5, favoritos e artistas escolhidos; notas 1 e 2 afastam. Uma nota explícita prevalece sobre o favorito do mesmo disco. Não usamos estilos/tags nem ações de outras pessoas neste modo. Só entram álbuns do catálogo MusicBrainz, no máximo dois por artista; avaliados, favoritos e dispensados ficam de fora. Seu vetor é descartado após a resposta.</p>
          : <p>Usamos só suas ações no myCDrecords e as preferências que você escolheu: notas 4 e 5 e favoritos aproximam, notas 1 e 2 afastam. Comparamos com as tags e créditos do catálogo MusicBrainz e com pessoas que deram notas altas aos mesmos discos. No máximo dois discos do mesmo artista aparecem entre os dez primeiros, e de vez em quando entra um estilo vizinho para explorar. Discos que você já avaliou, favoritou ou dispensou ficam de fora.</p>}
        <p>Dados do Spotify não entram nas sugestões. Metadados: <a href="https://musicbrainz.org" target="_blank" rel="noopener noreferrer">MusicBrainz</a>. Capas: <a href="https://coverartarchive.org" target="_blank" rel="noopener noreferrer">Cover Art Archive</a>.</p>
      </details>
    </>}
  </div>
}
