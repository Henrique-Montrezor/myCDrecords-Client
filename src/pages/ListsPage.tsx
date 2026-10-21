import { Plus, RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import ListCard from '../components/ListCard'
import ListForm from '../components/ListForm'
import { useResource } from '../hooks/useResource'
import { createList, getMyLists, type ListInput } from '../services/api'

export default function ListsPage() {
  const { resource, reload } = useResource((signal) => getMyLists(signal), 'me')
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    document.title = 'Suas listas | myCDrecords'
    return () => { document.title = 'myCDrecords - sua escuta, seu arquivo' }
  }, [])

  async function handleCreate(input: ListInput) {
    await createList(input)
    setCreating(false)
    setNotice(`Lista “${input.title}” criada.`)
    reload()
  }

  return <section className="lists-page">
    <div className="section-heading">
      <div><p className="eyebrow">SUAS LISTAS</p><h1 className="page-title">Discos organizados do seu jeito</h1></div>
      {!creating && <button type="button" className="primary-button" onClick={() => { setNotice(''); setCreating(true) }}><Plus size={16} /> Nova lista</button>}
    </div>
    <p className="share-status" role="status">{notice}</p>
    {creating && <ListForm submitLabel="Criar lista" onSubmit={handleCreate} onCancel={() => setCreating(false)} />}
    {resource.status === 'loading' && <p className="loading-copy" role="status">Carregando listas...</p>}
    {resource.status === 'error' && <div className="empty-state" role="alert"><p>Não foi possível carregar suas listas.</p><button type="button" className="secondary-button" onClick={reload}><RotateCw size={16} /> Tentar novamente</button></div>}
    {resource.status === 'ready' && resource.data.length === 0 && !creating && <div className="empty-state"><p>Você ainda não criou nenhuma lista.</p><button type="button" className="secondary-button" onClick={() => setCreating(true)}><Plus size={16} /> Criar a primeira</button></div>}
    {resource.status === 'ready' && resource.data.length > 0 && <ul className="list-grid">{resource.data.map((list) => <ListCard key={list.id} list={list} />)}</ul>}
  </section>
}
