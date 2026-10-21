import { Check, ListPlus, Plus, RotateCw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, addAlbumToList, createList, getMyLists, isAbortError, type ListInput } from '../services/api'
import type { AlbumDetails, ApiList } from '../types/api'
import ListForm from './ListForm'

type ListsState = { status: 'loading' | 'ready' | 'error'; lists: ApiList[] }
type ItemState = 'idle' | 'saving' | 'added' | 'exists' | 'error'

export default function AddToListButton({ album }: { album: AlbumDetails }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [lists, setLists] = useState<ListsState>({ status: 'loading', lists: [] })
  const [items, setItems] = useState<Record<number, ItemState>>({})
  const [creating, setCreating] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the request on retry.
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setLists({ status: 'loading', lists: [] })
    getMyLists(controller.signal)
      .then((data) => setLists({ status: 'ready', lists: data }))
      .catch((error: unknown) => {
        if (!isAbortError(error)) setLists({ status: 'error', lists: [] })
      })
    return () => controller.abort()
  }, [open, attempt])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function close() {
    setOpen(false)
    setCreating(false)
    setItems({})
  }

  async function add(list: ApiList) {
    setItems((current) => ({ ...current, [list.id]: 'saving' }))
    try {
      await addAlbumToList(list.id, album)
      setItems((current) => ({ ...current, [list.id]: 'added' }))
      setLists((current) => ({ ...current, lists: current.lists.map((entry) => entry.id === list.id ? { ...entry, item_count: Number(entry.item_count ?? 0) + 1 } : entry) }))
    } catch (error) {
      setItems((current) => ({ ...current, [list.id]: error instanceof ApiError && error.status === 409 ? 'exists' : 'error' }))
    }
  }

  async function createAndAdd(input: ListInput) {
    const { listId } = await createList(input)
    const created: ApiList = { id: listId, user_id: 0, title: input.title, description: input.description || null, is_public: input.isPublic, created_at: '', updated_at: '', item_count: 0 }
    setLists((current) => ({ status: 'ready', lists: [created, ...current.lists] }))
    setCreating(false)
    await add(created)
  }

  const labels: Record<ItemState, string> = { idle: 'Adicionar', saving: 'Salvando...', added: 'Adicionado', exists: 'Já está na lista', error: 'Tentar de novo' }

  return <>
    <button type="button" className="secondary-button" onClick={() => setOpen(true)}><ListPlus size={16} /> Adicionar à lista</button>
    <dialog ref={dialogRef} className="dialog" aria-labelledby="add-to-list-title" onClose={close}>
      <div className="dialog-panel">
        <div className="dialog-head">
          <div><p className="eyebrow">SUAS LISTAS</p><h2 id="add-to-list-title">Adicionar “{album.title}”</h2></div>
          <button type="button" className="icon-button" onClick={close} aria-label="Fechar"><X size={18} /></button>
        </div>
        {lists.status === 'loading' && <p className="loading-copy" role="status">Carregando listas...</p>}
        {lists.status === 'error' && <div className="empty-state" role="alert"><p>Não foi possível carregar suas listas.</p><button type="button" className="secondary-button" onClick={() => setAttempt((value) => value + 1)}><RotateCw size={16} /> Tentar novamente</button></div>}
        {lists.status === 'ready' && lists.lists.length === 0 && !creating && <div className="empty-state"><p>Você ainda não tem listas.</p></div>}
        {lists.status === 'ready' && lists.lists.length > 0 && <ul className="dialog-list">{lists.lists.map((list) => {
          const state = items[list.id] ?? 'idle'
          return <li key={list.id}>
            <div><strong>{list.title}</strong><span>{Number(list.item_count ?? 0)} {Number(list.item_count ?? 0) === 1 ? 'álbum' : 'álbuns'}</span></div>
            <button type="button" className={state === 'added' ? 'primary-button' : 'secondary-button'} onClick={() => void add(list)} disabled={state === 'saving' || state === 'added' || state === 'exists'} aria-live="polite">
              {state === 'added' && <Check size={14} />}{labels[state]}
            </button>
          </li>
        })}</ul>}
        {lists.status === 'ready' && (creating
          ? <ListForm compact submitLabel="Criar e adicionar" onSubmit={createAndAdd} onCancel={() => setCreating(false)} />
          : <button type="button" className="text-button" onClick={() => setCreating(true)}><Plus size={15} /> Nova lista</button>)}
        <p className="dialog-foot"><Link to="/lists" onClick={close}>Gerenciar listas</Link></p>
      </div>
    </dialog>
  </>
}
