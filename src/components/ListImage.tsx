import { ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useResource } from '../hooks/useResource'
import { useSession } from '../contexts/SessionContext'
import { getListImage } from '../services/api'
import type { ListImageKind } from '../types/api'

export default function ListImage({ listId, kind, revision, alt, retry = false }: { listId: number; kind: ListImageKind; revision?: number; alt: string; retry?: boolean }) {
  const { user, status } = useSession()
  const { resource, reload } = useResource((signal) => getListImage(listId, kind, signal), `${listId}-${kind}-${revision}-${status}-${user?.id}`)
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setUrl('')
    setFailed(false)
    if (resource.status !== 'ready') return
    const objectUrl = URL.createObjectURL(resource.data)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [resource])
  if (resource.status === 'error' || failed) return <span className={`list-own-image list-own-image--${kind} list-image-unavailable`}>
    <ImageOff size={24} aria-hidden="true" /><span>Imagem indisponível</span>
    {retry && <button type="button" className="text-button" onClick={reload}>Tentar carregar imagem novamente</button>}
  </span>
  return <span className={`list-own-image list-own-image--${kind}`}>
    {url ? <img src={url} alt={alt} onError={() => setFailed(true)} /> : <span role="status" className="sr-only">Carregando imagem...</span>}
  </span>
}
