import { Disc3, Globe, Lock, Pencil, RotateCw, Share2, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ListForm from '../components/ListForm'
import { pluralAlbums } from '../components/ListCard'
import { useSession } from '../contexts/SessionContext'
import { useResource } from '../hooks/useResource'
import { ApiError, deleteList, isAbortError, removeAlbumFromList, updateList, type ListInput } from '../services/api'
import { getList } from '../services/api'
import type { ApiListDetails, ApiListItem } from '../types/api'
import NotFoundPage from './NotFoundPage'

function ListItem({ item, canRemove, onRemove }: { item: ApiListItem; canRemove: boolean; onRemove: () => void }) {
  const [coverFailed, setCoverFailed] = useState(false)
  const title = item.album_title ?? 'Álbum'
  return <li className="list-item">
    <Link className="album-card" to={`/albums/${encodeURIComponent(item.album_id)}`}>
      <div className="album-cover-wrap">
        {item.album_image && !coverFailed
          ? <img className="album-art" src={item.album_image} alt="" loading="lazy" onError={() => setCoverFailed(true)} />
          : <div className="album-art album-art--empty" aria-hidden="true"><Disc3 size={34} /></div>}
      </div>
      <div className="album-info"><h3>{title}</h3><p>{item.album_artist ?? ''}</p></div>
    </Link>
    {canRemove && <button type="button" className="icon-button list-item-remove" onClick={onRemove} aria-label={`Remover ${title} da lista`}><X size={15} /></button>}
  </li>
}

function ListView({ initial, onReload }: { initial: ApiListDetails; onReload: () => void }) {
  const { user } = useSession()
  const navigate = useNavigate()
  const [list, setList] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const isOwner = user?.id === Number(list.user_id)
  const isPublic = Boolean(list.is_public)

  useEffect(() => {
    document.title = `${list.title} | myCDrecords`
    return () => { document.title = 'myCDrecords - sua escuta, seu arquivo' }
  }, [list.title])

  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(() => setMessage(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [message])

  async function handleUpdate(input: ListInput) {
    await updateList(list.id, input)
    setList((current) => ({ ...current, title: input.title, description: input.description || null, is_public: input.isPublic }))
    setEditing(false)
    setMessage('Lista atualizada.')
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteList(list.id)
      navigate('/lists', { replace: true })
    } catch {
      setDeleting(false)
      setConfirmingDelete(false)
      setMessage('Não foi possível excluir a lista.')
    }
  }

  async function handleRemove(item: ApiListItem) {
    const previous = list.items
    setList((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }))
    try {
      await removeAlbumFromList(list.id, item.album_id)
    } catch (error) {
      // 404 means it was already gone, so the optimistic state is right.
      if (!(error instanceof ApiError && error.status === 404)) {
        setList((current) => ({ ...current, items: previous }))
        setMessage('Não foi possível remover o álbum.')
      }
    }
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: list.title, url: window.location.href })
      else {
        await navigator.clipboard.writeText(window.location.href)
        setMessage('Link copiado.')
      }
    } catch (error) {
      if (isAbortError(error)) return
      setMessage('Não foi possível compartilhar.')
    }
  }

  return <section className="list-detail">
    <header className="list-detail-header">
      <div className="list-detail-heading">
        <p className="eyebrow">LISTA</p>
        {editing
          ? <ListForm initial={{ title: list.title, description: list.description ?? '', isPublic }} submitLabel="Salvar alterações" onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
          : <>
            <h1 className="page-title">{list.title}</h1>
            {list.description && <p className="list-detail-description">{list.description}</p>}
            <p className="list-detail-meta">{pluralAlbums(list.items.length)} · {isPublic ? <><Globe size={11} aria-hidden="true" /> Pública</> : <><Lock size={11} aria-hidden="true" /> Privada</>}</p>
          </>}
      </div>
      {!editing && <div className="list-detail-actions">
        {isPublic && <button type="button" className="secondary-button" onClick={share}><Share2 size={15} /> Compartilhar</button>}
        {isOwner && <button type="button" className="secondary-button" onClick={() => setEditing(true)}><Pencil size={15} /> Editar</button>}
        {isOwner && !confirmingDelete && <button type="button" className="secondary-button list-delete" onClick={() => setConfirmingDelete(true)}><Trash2 size={15} /> Excluir</button>}
        {isOwner && confirmingDelete && <span className="list-confirm" role="alertdialog" aria-label="Confirmar exclusão da lista">
          Excluir esta lista?
          <button type="button" className="secondary-button list-delete" onClick={() => void handleDelete()} disabled={deleting}>{deleting ? 'Excluindo...' : 'Sim, excluir'}</button>
          <button type="button" className="secondary-button" onClick={() => setConfirmingDelete(false)} disabled={deleting}>Cancelar</button>
        </span>}
      </div>}
    </header>
    <p className="share-status" role="status">{message}</p>

    {list.items.length === 0
      ? <div className="empty-state">
        <p>{isOwner ? 'Esta lista ainda está vazia. Abra um álbum e use “Adicionar à lista”.' : 'Esta lista ainda não tem álbuns.'}</p>
        {isOwner && <Link className="secondary-button" to="/search">Descobrir álbuns</Link>}
      </div>
      : <ul className="album-grid list-items">{list.items.map((item) => <ListItem key={item.id} item={item} canRemove={isOwner} onRemove={() => void handleRemove(item)} />)}</ul>}
    {!isOwner && <p className="loading-copy"><button type="button" className="text-button" onClick={onReload}><RotateCw size={14} /> Atualizar lista</button></p>}
  </section>
}

export default function ListDetailPage() {
  const { listId = '' } = useParams()
  const id = Number(listId)
  const { resource, reload } = useResource((signal) => getList(id, signal), listId)

  if (!Number.isInteger(id) || id <= 0) return <NotFoundPage title="Lista não encontrada." message="O endereço desta lista não é válido." />
  if (resource.status === 'loading') return <p className="loading-copy" role="status">Carregando lista...</p>
  if (resource.status === 'error') {
    if (resource.error instanceof ApiError && resource.error.status === 404) return <NotFoundPage title="Lista não encontrada." message="Esta lista foi excluída ou o link está incorreto." />
    if (resource.error instanceof ApiError && resource.error.status === 403) return <NotFoundPage title="Lista privada." message="Só quem criou esta lista pode vê-la." />
    return <div className="empty-state" role="alert"><p>Não foi possível carregar esta lista.</p><button type="button" className="secondary-button" onClick={reload}><RotateCw size={16} /> Tentar novamente</button></div>
  }
  return <ListView key={`${resource.data.id}-${resource.data.updated_at}`} initial={resource.data} onReload={reload} />
}
