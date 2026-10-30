import { Disc3, Globe, ListMusic, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ApiList } from '../types/api'
import SaveListButton from './SaveListButton'
import ListImage from './ListImage'

export function pluralAlbums(count: number) {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? 'álbum' : 'álbuns'}`
}

function Preview({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false)
  return <span className="list-preview-cover">{url && !failed ? <img src={url} alt="" width={100} height={100} loading="lazy" onError={() => setFailed(true)} /> : <Disc3 size={24} aria-hidden="true" />}</span>
}

export default function ListCard({ list, social = false, canSave = false, onSaved }: { list: ApiList; social?: boolean; canSave?: boolean; onSaved?: (saved: boolean) => void }) {
  const isPublic = Boolean(list.is_public)
  if (social) return <li className="curated-list-card">
    <Link className={list.has_thumbnail ? 'list-thumbnail-link' : 'list-preview'} to={`/lists/${list.id}`} aria-label={`Abrir ${list.title}`}>
      {list.has_thumbnail ? <ListImage listId={list.id} kind="thumbnail" revision={list.image_revision} alt="" /> : Array.from({ length: 4 }, (_, index) => <Preview key={list.previews?.[index]?.album_id ?? `empty-${index}`} url={list.previews?.[index]?.album_image ?? null} />)}
    </Link>
    <div className="curated-list-title"><h3><Link to={`/lists/${list.id}`}>{list.title}</Link></h3><span>{pluralAlbums(Number(list.item_count ?? 0))}</span></div>
    {list.username && <p className="list-author">por <Link to={`/profile/${encodeURIComponent(list.username)}`}>{list.username}</Link>{!isPublic && <span><Lock size={12} aria-hidden="true" /> Privada</span>}</p>}
    {list.description && <p className="curated-list-description">{list.description}</p>}
    <div className="curated-list-footer">{canSave && isPublic && <SaveListButton listId={list.id} title={list.title} initialSaved={Boolean(list.is_saved)} onSaved={onSaved} />}
      {Number(list.save_count ?? 0) > 0 && <span>{Number(list.save_count).toLocaleString('pt-BR')} {Number(list.save_count) === 1 ? 'salvo' : 'salvos'} em 30 dias</span>}
    </div>
  </li>
  return <li className="list-card">
    <Link to={`/lists/${list.id}`}>
      {list.has_thumbnail ? <span className="list-card-thumbnail"><ListImage listId={list.id} kind="thumbnail" revision={list.image_revision} alt="" /></span> : <span className="list-card-icon" aria-hidden="true"><ListMusic size={20} /></span>}
      <span className="list-card-body">
        <strong>{list.title}</strong>
        {list.description && <span className="list-card-description">{list.description}</span>}
        <span className="list-card-meta">
          {pluralAlbums(Number(list.item_count ?? 0))}
          <span className="list-card-visibility">{isPublic ? <><Globe size={11} aria-hidden="true" /> Pública</> : <><Lock size={11} aria-hidden="true" /> Privada</>}</span>
        </span>
      </span>
    </Link>
  </li>
}
