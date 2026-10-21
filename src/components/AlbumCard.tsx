import { Disc3 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Album } from '../types/api'

export default function AlbumCard({ album }: { album: Album }) {
  const [coverFailed, setCoverFailed] = useState(false)

  return <Link className="album-card" to={album.link}>
    <div className="album-cover-wrap">
      {album.cover && !coverFailed
        ? <img className="album-art" src={album.cover} alt="" loading="lazy" onError={() => setCoverFailed(true)} />
        : <div className="album-art album-art--empty" aria-hidden="true"><Disc3 size={34} /></div>}
    </div>
    <div className="album-info">
      <h3>{album.title}</h3>
      <p>{album.artist}{album.year && <span>{album.year}</span>}</p>
    </div>
  </Link>
}
