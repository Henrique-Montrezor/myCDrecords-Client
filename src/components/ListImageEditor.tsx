import { Disc3 } from 'lucide-react'
import { useState } from 'react'
import ImageUpload from './ImageUpload'
import ListImage from './ListImage'
import { removeListImage, uploadListImage } from '../services/api'
import type { ApiList } from '../types/api'

export default function ListImageEditor({ list, onClose, onChanged }: { list: ApiList; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [images, setImages] = useState({ thumbnail: Boolean(list.has_thumbnail), banner: Boolean(list.has_banner), revision: list.image_revision ?? 0 })
  return <section className="list-image-editor" aria-labelledby="list-image-editor-title">
    <h2 id="list-image-editor-title">Identidade da lista</h2>
    <p>Use imagens próprias ou que você tenha direito de publicar. Não envie capas ou imagens do Spotify. Cada alteração é salva na hora.</p>
    {(['thumbnail', 'banner'] as const).map((kind) => <ImageUpload key={kind} kind={kind === 'thumbnail' ? 'avatar' : 'banner'}
      label={kind === 'thumbnail' ? 'Foto da lista' : 'Capa da lista'}
      hint={kind === 'thumbnail' ? 'Miniatura quadrada · 512 × 512 pixels.' : 'Imagem horizontal · 1600 × 480 pixels.'}
      hasImage={images[kind]} disabled={busy} onBusy={setBusy}
      actions={{ upload: (image) => uploadListImage(list.id, kind, image), remove: () => removeListImage(list.id, kind) }}
      onChange={(url) => {
        setImages((current) => ({ ...current, [kind]: Boolean(url), revision: current.revision + 1 }))
        setNotice(url ? 'Imagem salva.' : 'Imagem removida.')
        onChanged()
      }}>
      {images[kind] ? <ListImage listId={list.id} kind={kind} revision={images.revision} alt={kind === 'thumbnail' ? 'Prévia da foto da lista' : 'Prévia da capa da lista'} retry />
        : <div className={`list-own-image list-own-image--${kind} list-image-placeholder`}><Disc3 size={28} aria-hidden="true" /><span>{kind === 'thumbnail' ? 'Sem foto própria' : 'Sem capa própria'}</span></div>}
    </ImageUpload>)}
    <p role="status">{notice}</p>
    <button className="secondary-button" type="button" disabled={busy} onClick={onClose}>Concluir imagens</button>
  </section>
}
