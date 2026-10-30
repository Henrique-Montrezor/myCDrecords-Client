import { Disc3, Globe, ImagePlus, ListOrdered, Lock, Pencil, RotateCw, Share2, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ListForm from '../components/ListForm'
import { pluralAlbums } from '../components/ListCard'
import { useSession } from '../contexts/SessionContext'
import { useResource } from '../hooks/useResource'
import { ApiError, deleteList, isAbortError, moveListItem, removeAlbumFromList, updateList, type ListInput } from '../services/api'
import { getList } from '../services/api'
import type { ApiListDetails, ApiListItem } from '../types/api'
import NotFoundPage from './NotFoundPage'
import SaveListButton from '../components/SaveListButton'
import ListImage from '../components/ListImage'
import ListImageEditor from '../components/ListImageEditor'
import ListOrderControls from '../components/ListOrderControls'

function ListItem({ item, canRemove, onRemove, position, total, organizing, busy, onMove }: {
  item: ApiListItem; canRemove: boolean; onRemove: () => void; position: number; total: number
  organizing: boolean; busy: boolean; onMove: (position: number) => Promise<void>
}) {
  const [coverFailed, setCoverFailed] = useState(false)
  const title = item.album_title ?? 'Álbum'
  return <li className="list-item" data-list-item-id={item.id}>
    <span className="list-item-position"><span className="sr-only">Posição </span>{position.toLocaleString('pt-BR').padStart(2, '0')}</span>
    <Link className="album-card" to={`/albums/${encodeURIComponent(item.album_id)}`}>
      <div className="album-cover-wrap">
        {item.album_image && !coverFailed
          ? <img className="album-art" src={item.album_image} alt="" loading="lazy" onError={() => setCoverFailed(true)} />
          : <div className="album-art album-art--empty" aria-hidden="true"><Disc3 size={34} /></div>}
      </div>
      <div className="album-info"><h3>{title}</h3><p>{item.album_artist ?? ''}</p></div>
    </Link>
    {canRemove && <button type="button" className="icon-button list-item-remove" onClick={onRemove} aria-label={`Remover ${title} da lista`}><X size={15} /></button>}
    {organizing && <ListOrderControls title={title} position={position} total={total} busy={busy} onMove={onMove} />}
  </li>
}

function ListView({ initial, onReload, onPage, organizing, onOrganize, onMoved, focusItemId }: {
  initial: ApiListDetails; onReload: () => void; onPage: (page: number) => void; organizing: boolean; onOrganize: () => void
  onMoved: (itemId: number, position: number, page: number) => void
  focusItemId: number | null
}) {
  const { user } = useSession()
  const navigate = useNavigate()
  const [list, setList] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [removing, setRemoving] = useState(false)
  const [imagesOpen, setImagesOpen] = useState(false)
  const [imagesChanged, setImagesChanged] = useState(false)
  const [moving, setMoving] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [orderConflict, setOrderConflict] = useState(false)
  const isOwner = user?.id === Number(list.user_id)
  const isPublic = Boolean(list.is_public)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setList(initial)
    setOrderConflict(false)
    setOrderError('')
  }, [initial])
  useEffect(() => {
    const target = focusItemId === null ? null : sectionRef.current?.querySelector<HTMLElement>(
      `[data-list-item-id="${focusItemId}"] .list-order-controls button:not(:disabled)`,
    )
    if (target) target.focus()
    else if (initial.page > 1) headingRef.current?.focus()
  }, [initial.page, focusItemId])

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
    if (removing || moving) return
    const previous = list
    setRemoving(true)
    setList((current) => ({ ...current, item_count: Math.max(0, Number(current.item_count) - 1), items: current.items.filter((entry) => entry.id !== item.id) }))
    try {
      await removeAlbumFromList(list.id, item.album_id)
      if (list.items.length === 1 && list.page > 1) onPage(list.page - 1)
      else onReload()
    } catch (error) {
      // 404 means it was already gone, so the optimistic state is right.
      if (!(error instanceof ApiError && error.status === 404)) {
        setList(previous)
        setMessage('Não foi possível remover o álbum.')
      } else onReload()
    } finally {
      setRemoving(false)
    }
  }

  async function handleMove(item: ApiListItem, position: number) {
    if (moving || removing || orderConflict) return
    setMoving(true)
    setOrderError('')
    try {
      const result = await moveListItem(list.id, { revision: list.order_revision, itemId: item.id, toPosition: position })
      onMoved(item.id, position, result.page)
    } catch (error) {
      const conflict = error instanceof ApiError && error.status === 409
      setOrderConflict(conflict)
      setOrderError(conflict ? 'A ordem mudou em outra sessão. Atualize a lista antes de mover novamente.' : 'Não foi possível mover o álbum. A ordem foi mantida; tente novamente.')
    } finally {
      setMoving(false)
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

  return <section className="list-detail" ref={sectionRef}>
    {list.has_banner && <ListImage listId={list.id} kind="banner" revision={list.image_revision} alt={`Capa da lista ${list.title}`} retry />}
    <header className="list-detail-header">
      <div className="list-detail-heading">
        <Link className="text-button list-back" to={user ? '/lists' : '/'}>{user ? 'Explorar listas' : 'myCDrecords'}</Link>
        {editing
          ? <ListForm initial={{ title: list.title, description: list.description ?? '', isPublic }} submitLabel="Salvar alterações" onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
          : <>
            <div className="list-detail-identity">
              {list.has_thumbnail && <ListImage listId={list.id} kind="thumbnail" revision={list.image_revision} alt={`Foto da lista ${list.title}`} retry />}
              <div><h1 className="page-title" tabIndex={-1} ref={headingRef}>{list.title}</h1>
                {list.username && <p className="list-author">por <Link to={`/profile/${encodeURIComponent(list.username)}`}>{list.username}</Link></p>}
              </div>
            </div>
            {list.description && <p className="list-detail-description">{list.description}</p>}
            <p className="list-detail-meta">{pluralAlbums(Number(list.item_count))} · {isPublic ? <><Globe size={11} aria-hidden="true" /> Pública</> : <><Lock size={11} aria-hidden="true" /> Privada</>}</p>
          </>}
      </div>
      {!editing && <div className="list-detail-actions">
        {!isOwner && isPublic && (user
          ? <SaveListButton listId={list.id} title={list.title} initialSaved={Boolean(list.is_saved)} />
          : <Link className="primary-button" to={`/lists/${list.id}?login=1`}>Entrar para salvar</Link>)}
        {isPublic && <button type="button" className="secondary-button" onClick={share}><Share2 size={15} /> Compartilhar</button>}
        {isOwner && <button type="button" className="secondary-button" disabled={imagesOpen || moving || removing} onClick={() => setEditing(true)}><Pencil size={15} /> Editar</button>}
        {isOwner && <button type="button" className="secondary-button" disabled={imagesOpen || moving || removing || confirmingDelete} onClick={() => setImagesOpen(true)}><ImagePlus size={15} /> Foto e capa</button>}
        {isOwner && Number(list.item_count) > 1 && <button type="button" className="secondary-button" disabled={imagesOpen || moving || removing} aria-pressed={organizing} onClick={onOrganize}><ListOrdered size={15} />{organizing ? 'Concluir ordem' : 'Organizar álbuns'}</button>}
        {isOwner && !confirmingDelete && <button type="button" className="secondary-button list-delete" disabled={imagesOpen || moving || removing} onClick={() => setConfirmingDelete(true)}><Trash2 size={15} /> Excluir</button>}
        {isOwner && confirmingDelete && <span className="list-confirm" role="alertdialog" aria-label="Confirmar exclusão da lista">
          Excluir esta lista?
          <button type="button" className="secondary-button list-delete" onClick={() => void handleDelete()} disabled={deleting}>{deleting ? 'Excluindo...' : 'Sim, excluir'}</button>
          <button type="button" className="secondary-button" onClick={() => setConfirmingDelete(false)} disabled={deleting}>Cancelar</button>
        </span>}
      </div>}
    </header>
    {imagesOpen && isOwner && <ListImageEditor list={list} onChanged={() => setImagesChanged(true)} onClose={() => {
      setImagesOpen(false)
      if (imagesChanged) onReload()
    }} />}
    <p className="share-status" role="status">{message}</p>
    {organizing && isOwner && <p className="list-order-hint">Ordem livre da curadoria, não um ranking. Mova acima, abaixo ou informe uma posição em qualquer página. Cada movimento é salvo na hora.</p>}
    <p className="sr-only" role="status">{moving ? 'Salvando a nova ordem...' : ''}</p>
    {orderError && <div className="list-order-error" role="alert"><p>{orderError}</p><button className="secondary-button" type="button" onClick={onReload}>Atualizar lista</button></div>}

    {list.items.length === 0
      ? <div className="empty-state">
        <p>{Number(list.item_count) > 0 ? 'Nenhum álbum nesta página.' : isOwner ? 'Esta lista ainda está vazia. Abra um álbum e use “Adicionar à lista”.' : 'Esta lista ainda não tem álbuns.'}</p>
        {Number(list.item_count) > 0 && <button type="button" className="secondary-button" onClick={() => onPage(1)}>Ir para a primeira página</button>}
        {isOwner && <Link className="secondary-button" to="/discover">Descobrir álbuns</Link>}
      </div>
      : <ul className={`album-grid list-items${organizing && isOwner ? ' list-items--organizing' : ''}`} aria-busy={removing || moving}>{list.items.map((item, index) => <ListItem key={`${item.id}-${list.order_revision}`} item={item}
        position={(list.page - 1) * list.pageSize + index + 1} total={Number(list.item_count)}
        organizing={organizing && isOwner} busy={moving || removing || orderConflict || imagesOpen}
        canRemove={isOwner && !removing && !moving && !imagesOpen} onRemove={() => void handleRemove(item)} onMove={(position) => handleMove(item, position)} />)}</ul>}
    <nav className="discovery-pagination" aria-label="Páginas de álbuns da lista">
      {list.page > 1 && <button type="button" className="secondary-button" disabled={removing || moving || imagesOpen} onClick={() => onPage(list.page - 1)}>Página anterior</button>}
      {list.totalPages > 0 && <span className="list-page-count">Página {list.page} de {list.totalPages}</span>}
      {list.page < list.totalPages && <button type="button" className="secondary-button" disabled={removing || moving || imagesOpen} onClick={() => onPage(list.page + 1)}>Próxima página</button>}
    </nav>
    {!isOwner && <p className="loading-copy"><button type="button" className="text-button" onClick={onReload}><RotateCw size={14} /> Atualizar lista</button></p>}
  </section>
}

export default function ListDetailPage() {
  const { listId = '' } = useParams()
  const { user } = useSession()
  const [params, setParams] = useSearchParams()
  const [organizing, setOrganizing] = useState(false)
  const [orderNotice, setOrderNotice] = useState('')
  const focusItem = useRef<number | null>(null)
  const page = Number(params.get('page') ?? '1')
  const id = Number(listId)
  const valid = Number.isSafeInteger(id) && id > 0 && Number.isInteger(page) && page > 0 && page <= 10000 && params.getAll('page').length <= 1
  const { resource, reload } = useResource((signal) => valid ? getList(id, signal, page) : Promise.reject(new Error('Endereço inválido.')), `${listId}-${page}-${user?.id ?? 'anonymous'}`)
  const changePage = (next: number, preserveFocus = false) => {
    if (!preserveFocus) focusItem.current = null
    const search = new URLSearchParams(params)
    search.set('page', String(next))
    setParams(search)
  }

  if (!valid) return <NotFoundPage title="Lista não encontrada." message="O endereço desta lista não é válido." />
  if (resource.status === 'loading') return <p className="loading-copy" role="status">Carregando lista...</p>
  if (resource.status === 'error') {
    if (resource.error instanceof ApiError && resource.error.status === 404) return <NotFoundPage title="Lista não encontrada." message="Esta lista foi excluída ou o link está incorreto." />
    if (resource.error instanceof ApiError && resource.error.status === 403) return <NotFoundPage title="Lista privada." message="Só quem criou esta lista pode vê-la." />
    return <div className="empty-state" role="alert"><p>Não foi possível carregar esta lista.</p><button type="button" className="secondary-button" onClick={reload}><RotateCw size={16} /> Tentar novamente</button></div>
  }
  return <div><p className="share-status" role="status">{orderNotice}</p>
    <ListView key={`${resource.data.id}-${resource.data.updated_at}-${resource.data.page}-${resource.data.order_revision}`} initial={resource.data} onReload={reload} onPage={changePage}
      organizing={organizing} focusItemId={focusItem.current} onOrganize={() => setOrganizing((current) => !current)} onMoved={(itemId, position, nextPage) => {
        focusItem.current = itemId
        setOrderNotice(`Álbum movido para a posição ${position.toLocaleString('pt-BR')}.`)
        if (nextPage !== page) changePage(nextPage, true)
        else reload()
      }} />
  </div>
}
