import { Globe, ListMusic, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ApiList } from '../types/api'

export function pluralAlbums(count: number) {
  return `${count} ${count === 1 ? 'álbum' : 'álbuns'}`
}

export default function ListCard({ list }: { list: ApiList }) {
  const isPublic = Boolean(list.is_public)
  return <li className="list-card">
    <Link to={`/lists/${list.id}`}>
      <span className="list-card-icon" aria-hidden="true"><ListMusic size={20} /></span>
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
