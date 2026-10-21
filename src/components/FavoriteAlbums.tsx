import { Disc3, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useResource } from '../hooks/useResource'
import { getFavorites } from '../services/api'
import type { ApiFavorite } from '../types/api'
import ErrorBox from './ErrorBox'
import FavoritesDialog, { FAVORITE_SLOTS } from './FavoritesDialog'

function FavoriteCover({ favorite }: { favorite: ApiFavorite }) {
  const [failed, setFailed] = useState(false)
  const title = favorite.album_title ?? 'Álbum'
  return <Link className="favorite" to={`/albums/${encodeURIComponent(favorite.album_id)}`} aria-label={`${title}${favorite.album_artist ? `, de ${favorite.album_artist}` : ''}`}>
    <span className="favorite-cover">
      {favorite.album_image && !failed
        ? <img src={favorite.album_image} alt="" loading="lazy" onError={() => setFailed(true)} />
        : <span className="favorite-fallback" aria-hidden="true"><Disc3 size={30} /></span>}
    </span>
    <span className="favorite-caption"><strong>{title}</strong><span>{favorite.album_artist}</span></span>
  </Link>
}

export default function FavoriteAlbums({ userId, username, isSelf }: { userId: number; username: string; isSelf: boolean }) {
  const { resource, reload, setResource } = useResource((signal) => getFavorites(userId, signal), String(userId))
  const [editing, setEditing] = useState(false)

  if (resource.status === 'loading') return <p className="loading-copy" role="status">Carregando favoritos...</p>
  if (resource.status === 'error') return <ErrorBox message="Não foi possível carregar os álbuns favoritos." onRetry={reload} />

  const favorites = resource.data
  if (!isSelf && favorites.length === 0) return null

  const slots = isSelf ? FAVORITE_SLOTS : favorites.length

  return <section className="favorites" aria-labelledby="favorites-title">
    <div className="section-heading">
      <div><p className="eyebrow">QUATRO QUE DEFINEM</p><h2 id="favorites-title">{isSelf ? 'Seus álbuns favoritos' : `Favoritos de ${username}`}</h2></div>
      {isSelf && <button type="button" className="text-button" onClick={() => setEditing(true)}><Pencil size={14} /> Editar favoritos</button>}
    </div>
    <ol className="favorites-grid">
      {Array.from({ length: slots }, (_, index) => {
        const favorite = favorites.find((item) => item.position === index + 1)
        return <li key={favorite?.album_id ?? `empty-${index}`}>
          {favorite
            ? <FavoriteCover favorite={favorite} />
            : <button type="button" className="favorite favorite--empty" onClick={() => setEditing(true)} aria-label={`Escolher o álbum favorito número ${index + 1}`}><span className="favorite-cover"><span className="favorite-fallback" aria-hidden="true"><Plus size={22} /></span></span></button>}
        </li>
      })}
    </ol>
    {isSelf && editing && <FavoritesDialog current={favorites} onClose={() => setEditing(false)} onSaved={(saved) => { setResource({ status: 'ready', data: saved }); setEditing(false) }} />}
  </section>
}
