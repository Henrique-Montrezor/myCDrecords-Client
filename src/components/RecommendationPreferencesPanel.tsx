import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useResource } from '../hooks/useResource'
import { getRecommendationPreferences, saveRecommendationPreferences, searchArtists } from '../services/api'
import type { ArtistSummary, RecommendationPreferences } from '../types/api'

const emptyPreferences: RecommendationPreferences = { genres: [], artists: [] }

export default function RecommendationPreferencesPanel({ onSaved, modelArtists }: { onSaved: () => void; modelArtists?: string[] }) {
  const { resource, reload } = useResource((signal) => getRecommendationPreferences(signal), 'recommendation-preferences')
  const [editedPreferences, setEditedPreferences] = useState<RecommendationPreferences | null>(null)
  const [genreInput, setGenreInput] = useState('')
  const [artistQuery, setArtistQuery] = useState('')
  const [artistResults, setArtistResults] = useState<ArtistSummary[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loading = resource.status === 'loading'
  const loadError = resource.status === 'error'
  const preferences = editedPreferences ?? (resource.status === 'ready' ? resource.data : emptyPreferences)

  function changePreferences(update: (current: RecommendationPreferences) => RecommendationPreferences) {
    setEditedPreferences((current) => update(current ?? (resource.status === 'ready' ? resource.data : emptyPreferences)))
  }

  function addGenre(event: FormEvent) {
    event.preventDefault()
    const genre = genreInput.trim().toLowerCase()
    if (!genre) return
    changePreferences((current) => current.genres.some((item) => item.toLowerCase() === genre)
      ? current
      : { ...current, genres: [...current.genres, genre].slice(0, 20) })
    setGenreInput('')
    setError('')
  }

  async function findArtists(event: FormEvent) {
    event.preventDefault()
    if (modelArtists) {
      if (!modelArtists.includes(artistQuery)) {
        setError('Selecione um artista suportado pelo modelo.')
        return
      }
      addArtist(artistQuery)
      return
    }
    const query = artistQuery.trim()
    if (query.length < 2) {
      setError('Digite pelo menos 2 caracteres para buscar um artista.')
      return
    }
    setSearching(true)
    setError('')
    try {
      setArtistResults(await searchArtists(query))
    } catch {
      setError('Não foi possível buscar artistas. Tente novamente.')
    } finally {
      setSearching(false)
    }
  }

  function addArtist(artist: string) {
    changePreferences((current) => current.artists.some((name) => name.toLowerCase() === artist.toLowerCase())
      ? current
      : { ...current, artists: [...current.artists, artist].slice(0, 20) })
    setArtistResults([])
    setArtistQuery('')
    setError('')
  }

  async function save() {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = await saveRecommendationPreferences(preferences)
      setEditedPreferences(saved)
      setNotice('Preferências salvas. Suas sugestões foram atualizadas.')
      onSaved()
    } catch {
      setError('Não foi possível salvar suas preferências. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const tasteCount = preferences.genres.length + preferences.artists.length

  return <section className="taste-preferences" aria-labelledby="taste-preferences-title">
    <div className="taste-preferences-heading">
      <div>
        <p className="eyebrow">SEU PRÓXIMO LADO A</p>
        <h2 id="taste-preferences-title">Ajuste seu gosto</h2>
      </div>
      {tasteCount > 0 && <span className="taste-count">{tasteCount} escolha{tasteCount === 1 ? '' : 's'}</span>}
    </div>
    <p className="taste-preferences-copy">{modelArtists
      ? 'No ML experimental, artistas suportados orientam as sugestões. Estilos são usados apenas pelo motor original. Adicione artistas abaixo e salve suas preferências.'
      : 'Escolha estilos e artistas para orientar as sugestões. Com três escolhas explícitas ou sinais suficientes nas suas avaliações, elas passam a ser personalizadas.'}</p>
    {loading && <p className="loading-copy" role="status">Carregando suas preferências...</p>}
    {loadError && <div className="taste-preferences-error" role="alert">
      <span>Não foi possível carregar suas preferências.</span>
      <button type="button" className="text-button" onClick={reload}>Tentar novamente</button>
    </div>}
    {!loading && !loadError && <>
      <form className="taste-control" onSubmit={addGenre}>
        <label htmlFor="taste-genre">Estilo ou gênero</label>
        <div className="taste-input-row">
          <input id="taste-genre" value={genreInput} maxLength={80} onChange={(event) => setGenreInput(event.target.value)} placeholder="Ex.: gothic rock" />
          <button type="submit" className="secondary-button" disabled={!genreInput.trim() || preferences.genres.length >= 20}>Adicionar</button>
        </div>
      </form>
      {preferences.genres.length > 0 && <ul className="taste-chips" aria-label="Estilos selecionados">{preferences.genres.map((genre) => <li key={genre}>
        <span>{genre}</span>
        <button type="button" aria-label={`Remover estilo ${genre}`} onClick={() => changePreferences((current) => ({ ...current, genres: current.genres.filter((item) => item !== genre) }))}><X size={14} /></button>
      </li>)}</ul>}
      <form className="taste-control" onSubmit={findArtists}>
        <label htmlFor="taste-artist">Artista</label>
        <div className="taste-input-row">
          {modelArtists
            ? <select id="taste-artist" value={artistQuery} disabled={modelArtists.length === 0} onChange={(event) => setArtistQuery(event.target.value)}>
              <option value="">Selecione um artista suportado</option>
              {modelArtists.map((name) => <option key={name} value={name} disabled={preferences.artists.includes(name)}>{name}</option>)}
            </select>
            : <input id="taste-artist" value={artistQuery} maxLength={120} onChange={(event) => setArtistQuery(event.target.value)} placeholder="Buscar no MusicBrainz" />}
          <button type="submit" className="secondary-button" disabled={searching || (modelArtists ? !modelArtists.includes(artistQuery) || preferences.artists.length >= 20 : artistQuery.trim().length < 2)}>{modelArtists ? 'Adicionar artista' : searching ? 'Buscando...' : 'Buscar'}</button>
        </div>
      </form>
      {artistResults.length > 0 && <ul className="taste-artist-results" aria-label="Resultados de artistas">{artistResults.map((artist) => <li key={artist.id}>
        <button type="button" disabled={preferences.artists.some((name) => name.toLowerCase() === artist.name.toLowerCase()) || preferences.artists.length >= 20} onClick={() => addArtist(artist.name)}>
          <span>{artist.name}</span><small>{artist.disambiguation || artist.type || 'MusicBrainz'}</small>
        </button>
      </li>)}</ul>}
      {preferences.artists.length > 0 && <ul className="taste-chips" aria-label="Artistas selecionados">{preferences.artists.map((artist) => <li key={artist}>
        <span>{artist}</span>
        <button type="button" aria-label={`Remover artista ${artist}`} onClick={() => changePreferences((current) => ({ ...current, artists: current.artists.filter((item) => item !== artist) }))}><X size={14} /></button>
      </li>)}</ul>}
      <p className="taste-source-note">Os estilos e artistas são comparados apenas com o catálogo MusicBrainz disponível.</p>
      {error && <p className="taste-form-error" role="alert">{error}</p>}
      {notice && <p className="taste-form-notice" role="status">{notice}</p>}
      <button type="button" className="primary-button" disabled={saving} onClick={save}>{saving ? 'Salvando...' : 'Salvar preferências'}</button>
    </>}
  </section>
}