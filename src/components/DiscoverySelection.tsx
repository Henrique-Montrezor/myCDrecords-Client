import { Disc3 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useResource } from '../hooks/useResource'
import { getDiscoverySelection } from '../services/api'
import type { Album, DiscoverySelectionData } from '../types/api'
import ErrorBox from './ErrorBox'

const publicationDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

function SelectionCover({ album, lead }: { album: Album; lead: boolean }) {
  const [failed, setFailed] = useState(false)
  return <Link className="selection-cover" to={album.link} aria-label={`Abrir ${album.title}`}>
    {album.cover && !failed
      ? <img src={album.cover} alt={`Capa de ${album.title}`} width={lead ? 300 : 72} height={lead ? 300 : 72} loading={lead ? 'eager' : 'lazy'} onError={() => setFailed(true)} />
      : <span className="selection-cover-fallback"><Disc3 size={lead ? 56 : 28} aria-hidden="true" /><span>Capa indisponível</span></span>}
  </Link>
}

function PublishedSelection({ selection }: { selection: DiscoverySelectionData }) {
  const [lead, ...others] = selection.items
  if (!lead) return null
  return <>
    <div className="selection-publication">
      <p>Curadoria myCDrecords{selection.curator && <> por <Link to={`/profile/${encodeURIComponent(selection.curator)}`}>{selection.curator}</Link></>}</p>
      {selection.updatedAt && <p>Publicada em <time dateTime={selection.updatedAt}>{publicationDate.format(new Date(selection.updatedAt))}</time></p>}
    </div>
    <article className="selection-lead">
      <SelectionCover key={lead.album.id} album={lead.album} lead />
      <div className="selection-lead-copy">
        <p className="selection-intent">Para a próxima escuta</p>
        <h3>{lead.album.title}</h3>
        <p className="selection-artist">{lead.album.artist}{lead.album.year && <> ({lead.album.year})</>}</p>
        <p className="selection-note">{lead.note}</p>
        <Link className="secondary-button" to={lead.album.link}>Conhecer o álbum</Link>
      </div>
    </article>
    {others.length > 0 && <ul className="selection-index">{others.map(({ album, note }) => <li key={album.id}>
      <SelectionCover album={album} lead={false} />
      <div><h3><Link to={album.link}>{album.title}</Link></h3><p className="selection-artist">{album.artist}{album.year && <> ({album.year})</>}</p><p className="selection-note">{note}</p></div>
    </li>)}</ul>}
    <p className="selection-provenance">Metadados: <a href="https://musicbrainz.org" target="_blank" rel="noopener noreferrer">MusicBrainz</a>. Capas: <a href="https://coverartarchive.org" target="_blank" rel="noopener noreferrer">Cover Art Archive</a>. Escolhas editoriais, não um ranking de popularidade.</p>
  </>
}

export default function DiscoverySelection() {
  const { resource, reload } = useResource((signal) => getDiscoverySelection(signal), 'discovery-selection')
  if (resource.status === 'ready' && resource.data.items.length === 0) return <p className="sr-only" role="status">Nenhuma seleção publicada ainda.</p>
  return <section className="discovery-selection" aria-labelledby="selection-title" aria-busy={resource.status === 'loading'}>
    <div className="selection-heading"><h2 id="selection-title">Escolhas da curadoria</h2><p>Discos e motivos para dar o play.</p></div>
    {resource.status === 'loading' && <p className="loading-copy" role="status">Carregando as escolhas da curadoria...</p>}
    {resource.status === 'error' && <ErrorBox message="Não foi possível carregar as escolhas da curadoria." onRetry={reload} />}
    {resource.status === 'ready' && <PublishedSelection selection={resource.data} />}
  </section>
}
