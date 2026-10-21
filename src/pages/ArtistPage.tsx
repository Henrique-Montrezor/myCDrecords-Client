import { RotateCw } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import AlbumCard from '../components/AlbumCard'
import { useResource } from '../hooks/useResource'
import { ApiError, getArtist } from '../services/api'
import type { ArtistDetails, ArtistRelease } from '../types/api'
import NotFoundPage from './NotFoundPage'

const groups: Array<{ type: ArtistRelease['type']; label: string }> = [
  { type: 'album', label: 'Álbuns' },
  { type: 'ep', label: 'EPs' },
  { type: 'single', label: 'Singles' },
  { type: 'other', label: 'Outros lançamentos' },
]

function Discography({ artist }: { artist: ArtistDetails }) {
  if (artist.releases.length === 0) return <div className="empty-state">O MusicBrainz ainda não lista lançamentos para este artista.</div>
  return <>{groups.map(({ type, label }) => {
    const releases = artist.releases.filter((release) => release.type === type)
    if (releases.length === 0) return null
    return <section className="section" key={type} aria-labelledby={`releases-${type}`}>
      <div className="section-heading"><div><p className="eyebrow">DISCOGRAFIA</p><h2 id={`releases-${type}`}>{label} <span className="count-badge">{releases.length}</span></h2></div></div>
      <div className="album-grid">{releases.map((release) => <AlbumCard key={release.id} album={{ id: release.id, title: release.title, artist: artist.name, year: release.year ?? '—', cover: release.coverUrl, link: `/albums/${encodeURIComponent(release.id)}` }} />)}</div>
    </section>
  })}</>
}

function ArtistView({ artist }: { artist: ArtistDetails }) {
  const meta = [artist.type, artist.country, artist.years].filter(Boolean)

  useEffect(() => {
    document.title = `${artist.name} | myCDrecords`
    return () => { document.title = 'myCDrecords - sua escuta, seu arquivo' }
  }, [artist.name])

  return <>
    <header className="artist-header">
      <p className="eyebrow">ARTISTA</p>
      <h1 className="artist-name">{artist.name}</h1>
      {(meta.length > 0 || artist.disambiguation) && <p className="artist-meta">{meta.join(' · ')}{meta.length > 0 && artist.disambiguation ? ' · ' : ''}{artist.disambiguation}</p>}
      {artist.tags.length > 0 && <ul className="tag-list" aria-label="Gêneros e tags">{artist.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>}
    </header>
    <Discography artist={artist} />
  </>
}

export default function ArtistPage() {
  const { mbid = '' } = useParams()
  const { resource, reload } = useResource((signal) => getArtist(mbid, signal), mbid)

  if (resource.status === 'loading') return <p className="loading-copy" role="status">Carregando artista...</p>
  if (resource.status === 'error') {
    if (resource.error instanceof ApiError && (resource.error.status === 404 || resource.error.status === 400)) return <NotFoundPage title="Artista não encontrado." message="Este artista não existe no MusicBrainz ou o link está incorreto." />
    return <div className="empty-state" role="alert"><p>Não foi possível carregar este artista.</p><button type="button" className="secondary-button" onClick={reload}><RotateCw size={16} /> Tentar novamente</button></div>
  }
  return <ArtistView artist={resource.data} />
}
