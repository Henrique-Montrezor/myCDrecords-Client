import { ArrowDown, ArrowUp, Disc3, Plus, X } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { isAbortError, saveFavorites, searchAlbums, type FavoriteInput } from '../services/api'
import type { Album, ApiFavorite } from '../types/api'

export const FAVORITE_SLOTS = 4
const SLOT_NUMBERS = [1, 2, 3, 4]

type SearchState = { status: 'idle' | 'loading' | 'error' } | { status: 'ready'; albums: Album[] }

function Thumb({ src }: { src?: string | null }) {
  const [failed, setFailed] = useState(false)
  return <span className="favorite-thumb">{src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : <Disc3 size={18} aria-hidden="true" />}</span>
}

export default function FavoritesDialog({ current, onClose, onSaved }: { current: ApiFavorite[]; onClose: () => void; onSaved: (saved: ApiFavorite[]) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [picked, setPicked] = useState<FavoriteInput[]>(() => current.map((item) => ({ albumId: item.album_id, albumTitle: item.album_title ?? 'Álbum', albumImage: item.album_image ?? undefined, albumArtist: item.album_artist ?? '' })))
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<SearchState>({ status: 'idle' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) { setSearch({ status: 'idle' }); return }
    const controller = new AbortController()
    setSearch({ status: 'loading' })
    const timer = setTimeout(() => {
      searchAlbums(term, controller.signal)
        .then((albums) => setSearch({ status: 'ready', albums }))
        .catch((failure: unknown) => { if (!isAbortError(failure)) setSearch({ status: 'error' }) })
    }, 350)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query])

  function add(album: Album) {
    setPicked((items) => items.length >= FAVORITE_SLOTS || items.some((item) => item.albumId === album.id)
      ? items
      : [...items, { albumId: album.id, albumTitle: album.title, albumImage: album.cover || undefined, albumArtist: album.artist }])
  }

  function move(index: number, delta: -1 | 1) {
    setPicked((items) => {
      const next = [...items]
      const [item] = next.splice(index, 1)
      next.splice(index + delta, 0, item)
      return next
    })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      onSaved(await saveFavorites(picked))
    } catch {
      setError('Não foi possível salvar seus favoritos. Tente novamente.')
      setSaving(false)
    }
  }

  const full = picked.length >= FAVORITE_SLOTS

  return <dialog ref={dialogRef} className="dialog dialog--wide" aria-labelledby="favorites-dialog-title" onClose={onClose}>
    <form className="dialog-panel" onSubmit={(event) => void submit(event)}>
      <div className="dialog-head">
        <div><p className="eyebrow">QUATRO QUE DEFINEM</p><h2 id="favorites-dialog-title">Editar álbuns favoritos</h2></div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
      </div>

      <ol className="favorites-picked">
        {SLOT_NUMBERS.map((slot, index) => {
          const item = picked[index]
          if (!item) return <li key={`slot-${slot}`} className="favorites-picked-empty">Espaço {slot} livre</li>
          return <li key={item.albumId}>
            <Thumb src={item.albumImage} />
            <div><strong>{item.albumTitle}</strong><span>{item.albumArtist}</span></div>
            <div className="favorites-picked-actions">
              <button type="button" className="icon-button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Mover ${item.albumTitle} para cima`}><ArrowUp size={16} /></button>
              <button type="button" className="icon-button" onClick={() => move(index, 1)} disabled={index === picked.length - 1} aria-label={`Mover ${item.albumTitle} para baixo`}><ArrowDown size={16} /></button>
              <button type="button" className="icon-button" onClick={() => setPicked((items) => items.filter((entry) => entry.albumId !== item.albumId))} aria-label={`Remover ${item.albumTitle}`}><X size={16} /></button>
            </div>
          </li>
        })}
      </ol>

      <div className="favorites-search">
        <label htmlFor="favorites-search-input">Buscar álbum para adicionar</label>
        <input id="favorites-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome do álbum ou artista" autoComplete="off" disabled={full} />
        <div aria-live="polite">
          {full && <p className="loading-copy">Você já escolheu quatro álbuns. Remova um para trocar.</p>}
          {!full && search.status === 'loading' && <p className="loading-copy">Buscando...</p>}
          {!full && search.status === 'error' && <p className="form-error" role="alert">Não foi possível buscar agora. Tente novamente.</p>}
          {!full && search.status === 'ready' && search.albums.length === 0 && <p className="loading-copy">Nenhum álbum encontrado.</p>}
        </div>
        {!full && search.status === 'ready' && search.albums.length > 0 && <ul className="favorites-results">
          {search.albums.map((album) => {
            const added = picked.some((item) => item.albumId === album.id)
            return <li key={album.id}>
              <Thumb src={album.cover} />
              <div><strong>{album.title}</strong><span>{album.artist}{album.year !== '—' && ` · ${album.year}`}</span></div>
              <button type="button" className="secondary-button" onClick={() => add(album)} disabled={added} aria-label={`${added ? 'Já adicionado' : 'Adicionar'}: ${album.title}`}>{added ? 'Adicionado' : <><Plus size={14} /> Adicionar</>}</button>
            </li>
          })}
        </ul>}
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="list-form-actions">
        <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar favoritos'}</button>
      </div>
    </form>
  </dialog>
}
