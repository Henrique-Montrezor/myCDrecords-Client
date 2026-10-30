import { ArrowRight, Disc3, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AlbumCard from '../components/AlbumCard'
import ErrorBox from '../components/ErrorBox'
import DiscoverySelection from '../components/DiscoverySelection'
import HomeRecommendations from '../components/HomeRecommendations'
import { useResource } from '../hooks/useResource'
import { discoverAlbums } from '../services/api'
import { discoveryGenres, type DiscoveryFilters, type DiscoveryGenre } from '../types/api'
import SearchPage from './SearchPage'

const genreLabels: Record<DiscoveryGenre, string> = {
  rock: 'Rock', pop: 'Pop', jazz: 'Jazz', electronic: 'Eletrônica', 'hip hop': 'Hip-hop',
  'gothic rock': 'Rock gótico', 'post-punk': 'Post-punk', darkwave: 'Darkwave', 'gothic metal': 'Metal gótico',
}

function isGenre(value: string): value is DiscoveryGenre {
  return discoveryGenres.some((genre) => genre === value)
}

function parseFilters(params: URLSearchParams): DiscoveryFilters | null {
  const year = params.get('year') ?? String(new Date().getFullYear())
  const genre = params.get('genre') ?? ''
  const type = params.get('type') ?? 'album'
  const offset = params.get('offset') ?? '0'
  if (Array.from(params.keys()).some((key) => !['year', 'genre', 'type', 'offset', 'q', 'tab'].includes(key) || params.getAll(key).length > 1)) return null
  if (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > new Date().getFullYear() + 1) return null
  if (genre !== '' && !isGenre(genre)) return null
  if (type !== 'album' && type !== 'ep' && type !== 'single') return null
  if (!/^\d+$/.test(offset) || Number(offset) > 1000) return null
  return { year, genre, type, offset }
}

function Catalog({ filters, onPage }: { filters: DiscoveryFilters; onPage: (offset: number) => void }) {
  const { resource, reload } = useResource((signal) => discoverAlbums(filters, signal), JSON.stringify(filters))
  const offset = Number(filters.offset)
  return <section id="catalogo" tabIndex={-1} className="discovery-catalog" aria-labelledby="discovery-results" aria-busy={resource.status === 'loading'}>
    <div className="section-heading">
      <h2 id="discovery-results">{filters.genre ? `${genreLabels[filters.genre]} · ${filters.year}` : `Discos de ${filters.year}`}</h2>
      {resource.status === 'ready' && <p className="discovery-count" role="status">{resource.data.total.toLocaleString('pt-BR')} resultados</p>}
    </div>
    {resource.status === 'loading' && <p className="loading-copy" role="status">Consultando o catálogo...</p>}
    {resource.status === 'error' && <ErrorBox message="Não foi possível explorar os discos agora." onRetry={reload} />}
    {resource.status === 'ready' && <>
      {resource.data.albums.length === 0
        ? <div className="empty-state"><Disc3 size={28} aria-hidden="true" /><p>Nenhum disco encontrado com estes filtros.</p><p>Experimente outro ano ou gênero.</p></div>
        : <div className="album-grid">{resource.data.albums.map((album) => <AlbumCard key={album.id} album={album} />)}</div>}
      <nav className="discovery-pagination" aria-label="Páginas do catálogo">
        {offset > 0 && <button type="button" className="secondary-button" onClick={() => onPage(Math.max(0, offset - 12))}>Página anterior</button>}
        {resource.data.nextOffset !== null && <button type="button" className="secondary-button" onClick={() => {
          if (resource.data.nextOffset !== null) onPage(resource.data.nextOffset)
        }}>Próxima página <ArrowRight size={16} aria-hidden="true" /></button>}
      </nav>
      {resource.data.nextOffset === null && offset + resource.data.albums.length < resource.data.total && <p className="discovery-source">Fim da janela de consulta. Refine os filtros para explorar outros discos.</p>}
    </>}
    <details className="discovery-source">
      <summary>Sobre estes resultados</summary>
      <p>Metadados: <a href="https://musicbrainz.org" target="_blank" rel="noopener noreferrer">MusicBrainz</a>. Capas: <a href="https://coverartarchive.org" target="_blank" rel="noopener noreferrer">Cover Art Archive</a>. Ordenação por relevância do catálogo, não por popularidade. Gêneros são tags da comunidade.</p>
    </details>
  </section>
}

function DiscoverySearch({ query, onSearch }: { query: string; onSearch: (value: string) => void }) {
  const [value, setValue] = useState(query)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => setValue(query), [query])
  return <search aria-label="Buscar no Descobrir"><form className="discovery-search" onSubmit={(event) => {
    event.preventDefault()
    setValue(value.trim())
    onSearch(value.trim())
  }}>
    <Search size={22} aria-hidden="true" />
    <input id="discover-search" ref={inputRef} type="search" aria-label="Buscar álbuns, artistas, faixas ou pessoas" placeholder="Álbum, artista ou faixa" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => {
      if (event.key === 'Escape') { setValue(''); onSearch('') }
    }} />
    {value && <button type="button" className="icon-button" aria-label="Limpar busca" onClick={() => { setValue(''); onSearch(''); inputRef.current?.focus() }}><X size={18} aria-hidden="true" /></button>}
    <button type="submit" className="primary-button">Buscar</button>
  </form></search>
}

export default function DiscoverPage() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterToggleRef = useRef<HTMLButtonElement>(null)
  const query = (params.get('q') ?? '').trim()
  const filters = parseFilters(params)
  const filterCount = filters ? Number(Boolean(filters.genre)) + Number(filters.year !== String(new Date().getFullYear())) + Number(filters.type !== 'album') : 0
  useEffect(() => {
    document.title = 'Descobrir | myCDrecords'
    return () => { document.title = 'myCDrecords - sua escuta, seu arquivo' }
  }, [])

  function changePage(offset: number) {
    const next = new URLSearchParams(params)
    if (offset > 0) next.set('offset', String(offset))
    else next.delete('offset')
    setParams(next)
  }

  function search(value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set('q', value)
    else { next.delete('q'); next.delete('tab') }
    next.delete('offset')
    setParams(next)
  }

  return <div className="discovery-page">
    <header className="discovery-intro">
      <div className="discovery-title-row"><h1>Descobrir</h1>{query && <button type="button" className="text-button discovery-back" onClick={() => search('')}>Voltar a explorar</button>}</div>
      <DiscoverySearch query={query} onSearch={search} />
    </header>
    {query ? <SearchPage embedded /> : filters ? <>
      <div className="discovery-toolbar">
        <nav className="discovery-paths" aria-label="Explorar por gênero">
          {[{ genre: '', title: 'Tudo' }, { genre: 'rock', title: 'Rock' }, { genre: 'jazz', title: 'Jazz' }, { genre: 'gothic rock', title: 'Gótico' }, { genre: 'electronic', title: 'Eletrônica' }, { genre: 'hip hop', title: 'Hip-hop' }].map((path) => {
            const next = new URLSearchParams(params)
            if (path.genre) next.set('genre', path.genre)
            else next.delete('genre')
            next.delete('offset')
            return <Link key={path.genre} to={{ pathname: '/discover', search: next.toString() }} aria-current={filters.genre === path.genre ? 'page' : undefined}>{path.title}</Link>
          })}
        </nav>
        <button ref={filterToggleRef} type="button" className="discovery-filter-toggle" aria-expanded={filtersOpen} aria-controls="discovery-filters" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16} aria-hidden="true" /> Filtros{filterCount > 0 && <span>{filterCount}</span>}</button>
      </div>
      {filtersOpen && <form id="discovery-filters" className="discovery-filters" key={params.toString()} onSubmit={(event) => {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        const next = new URLSearchParams()
        for (const key of ['genre', 'year', 'type']) {
          const value = values.get(key)
          if (typeof value === 'string' && value) next.set(key, value)
        }
        setParams(next)
        setFiltersOpen(false)
        filterToggleRef.current?.focus()
      }}>
        <div><label htmlFor="discover-genre">Gênero</label><select id="discover-genre" name="genre" defaultValue={filters.genre}><option value="">Todos os gêneros</option>{discoveryGenres.map((genre) => <option key={genre} value={genre}>{genreLabels[genre]}</option>)}</select></div>
        <div><label htmlFor="discover-year">Ano de lançamento</label><input id="discover-year" name="year" type="number" min={1900} max={new Date().getFullYear() + 1} required defaultValue={filters.year} /></div>
        <div><label htmlFor="discover-type">Formato</label><select id="discover-type" name="type" defaultValue={filters.type}><option value="album">Álbum</option><option value="ep">EP</option><option value="single">Single</option></select></div>
        <button type="submit" className="primary-button">Aplicar filtros</button>
        <button type="button" className="secondary-button" onClick={() => { setParams({}); setFiltersOpen(false); filterToggleRef.current?.focus() }}>Limpar filtros</button>
      </form>}
      {filterCount === 0 && <HomeRecommendations layout="shelf" />}
      <Catalog key={JSON.stringify(filters)} filters={filters} onPage={changePage} />
      {filterCount === 0 && <DiscoverySelection />}
    </> : <div className="empty-state" role="alert"><p>Filtros inválidos. Escolha um ano, gênero e formato disponíveis.</p><button type="button" className="secondary-button" onClick={() => setParams({})}>Limpar filtros</button></div>}
  </div>
}
