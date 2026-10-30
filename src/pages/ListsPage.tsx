import { Plus, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ListCard from '../components/ListCard'
import ListForm from '../components/ListForm'
import { useResource } from '../hooks/useResource'
import { createList, exploreLists, type ListInput } from '../services/api'
import { useSession } from '../contexts/SessionContext'
import type { ListDiscoveryFilters, ListScope } from '../types/api'
import ErrorBox from '../components/ErrorBox'

const scopes: Array<{ id: ListScope; title: string }> = [
  { id: 'popular', title: 'Populares' }, { id: 'following', title: 'Quem sigo' }, { id: 'friends', title: 'Amigos' },
  { id: 'mine', title: 'Minhas listas' }, { id: 'saved', title: 'Salvas' },
]
function parseFilters(params: URLSearchParams): ListDiscoveryFilters | null {
  const scope = scopes.find((item) => item.id === (params.get('scope') ?? 'popular'))?.id
  const sort = params.get('sort') ?? (scope === 'popular' ? 'popular' : 'recent')
  const page = params.get('page') ?? '1'
  const q = (params.get('q') ?? '').trim()
  if (!scope || !['popular', 'recent'].includes(sort) || !/^[1-9]\d*$/.test(page) || Number(page) > 10000 || q.length > 100 ||
    Array.from(params.keys()).some((key) => !['scope', 'q', 'sort', 'page'].includes(key) || params.getAll(key).length > 1)) return null
  return { scope, sort: sort === 'popular' ? 'popular' : 'recent', page: Number(page), q }
}

function ListResults({ filters, onPage, onCreate, version }: { filters: ListDiscoveryFilters; onPage: (page: number) => void; onCreate: () => void; version: number }) {
  const { user } = useSession()
  const { resource, reload } = useResource((signal) => exploreLists(filters, signal), `${JSON.stringify(filters)}-${version}`)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (resource.status === 'ready' && filters.page > 1) headingRef.current?.focus()
  }, [resource.status, filters.page])
  const title = filters.scope === 'popular'
    ? resource.status === 'ready' && resource.data.mode === 'recent' ? 'Listas recentes' : 'Populares em 30 dias'
    : scopes.find((scope) => scope.id === filters.scope)?.title
  return <section className="list-discovery-results" aria-labelledby="lists-results-title" aria-busy={resource.status === 'loading'}>
    <div className="list-results-heading"><h2 ref={headingRef} tabIndex={-1} id="lists-results-title">{title}</h2>{resource.status === 'ready' && <span role="status">{resource.data.total.toLocaleString('pt-BR')} {resource.data.total === 1 ? 'lista' : 'listas'}</span>}</div>
    {resource.status === 'loading' && <p className="loading-copy" role="status">Carregando listas...</p>}
    {resource.status === 'error' && <ErrorBox message="Não foi possível carregar as listas." onRetry={reload} />}
    {resource.status === 'ready' && <>
      {filters.sort === 'popular' && resource.data.mode === 'recent' && <p className="lists-context">Ainda sem amostra para um ranking. Explore as publicações mais recentes.</p>}
      {resource.data.items.length === 0 ? <div className="empty-state"><p>{resource.data.total > 0 ? 'Nenhuma lista nesta página.' : filters.q ? 'Nenhuma lista encontrada. Tente outro título ou autor.' : filters.scope === 'mine' ? 'Você ainda não criou nenhuma lista.' : filters.scope === 'saved' ? 'As listas que você salvar aparecem aqui.' : filters.scope === 'friends' ? 'Nenhuma lista pública de amigos por enquanto. Amigos são pessoas que também seguem você.' : filters.scope === 'following' ? 'Quem você segue ainda não publicou listas.' : 'Ainda não há listas públicas. A próxima curadoria pode ser sua.'}</p>
        {resource.data.total > 0 ? <button type="button" className="secondary-button" onClick={() => onPage(1)}>Ir para a primeira página</button> : filters.scope === 'mine' || filters.scope === 'popular' ? <button type="button" className="secondary-button" onClick={onCreate}>Criar uma lista</button> : <Link className="secondary-button" to="/lists">Explorar listas</Link>}
      </div> : <ul className="curated-list-grid">{resource.data.items.map((list) => <ListCard key={`${list.id}-${Boolean(list.is_saved)}`} list={list} social canSave={user?.id !== Number(list.user_id)} onSaved={() => { if (filters.scope === 'saved') reload() }} />)}</ul>}
      <nav className="discovery-pagination" aria-label="Páginas de listas">
        {filters.page > 1 && <button type="button" className="secondary-button" onClick={() => onPage(filters.page - 1)}>Página anterior</button>}
        {filters.page < resource.data.totalPages && <button type="button" className="secondary-button" onClick={() => onPage(filters.page + 1)}>Próxima página</button>}
      </nav>
    </>}
  </section>
}

export default function ListsPage() {
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  const [version, setVersion] = useState(0)
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    document.title = 'Listas | myCDrecords'
    return () => { document.title = 'myCDrecords - sua escuta, seu arquivo' }
  }, [])

  async function handleCreate(input: ListInput) {
    await createList(input)
    setCreating(false)
    setNotice(`Lista “${input.title}” criada.`)
    setParams({ scope: 'mine' })
    setVersion((value) => value + 1)
  }

  return <section className="lists-page">
    <div className="section-heading">
      <div><h1 className="page-title">Listas</h1><p className="lists-intro">Um caminho por discos, escolhido por alguém.</p></div>
      {!creating && <button type="button" className="primary-button" onClick={() => { setNotice(''); setCreating(true) }}><Plus size={16} /> Nova lista</button>}
    </div>
    <p className="share-status" role="status">{notice}</p>
    {creating && <ListForm submitLabel="Criar lista" onSubmit={handleCreate} onCancel={() => setCreating(false)} />}
    <nav className="list-scopes" aria-label="Explorar listas">{scopes.map((scope) => {
      const next = new URLSearchParams(params)
      next.set('scope', scope.id)
      next.delete('page')
      next.set('sort', scope.id === 'popular' ? 'popular' : 'recent')
      return <Link key={scope.id} aria-current={filters?.scope === scope.id ? 'page' : undefined} to={{ pathname: '/lists', search: next.toString() }}>{scope.title}</Link>
    })}</nav>
    {filters ? <>
      <form className="list-discovery-search" key={`${filters.q}-${filters.sort}`} onSubmit={(event) => {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        const next = new URLSearchParams(params)
        const q = String(values.get('q') ?? '').trim()
        if (q) next.set('q', q)
        else next.delete('q')
        next.set('sort', String(values.get('sort')))
        next.delete('page')
        setParams(next)
      }}>
        <div><Search size={18} aria-hidden="true" /><input name="q" type="search" maxLength={100} aria-label="Buscar listas por título ou autor" placeholder="Título da lista ou autor" defaultValue={filters.q} /></div>
        <select name="sort" aria-label="Ordenar listas" defaultValue={filters.sort}><option value="popular">Mais salvas em 30 dias</option><option value="recent">Mais recentes</option></select>
        <button type="submit" className="secondary-button">Buscar</button>
      </form>
      <ListResults key={JSON.stringify(filters)} filters={filters} version={version} onCreate={() => setCreating(true)} onPage={(page) => {
        const next = new URLSearchParams(params)
        next.set('page', String(page))
        setParams(next)
      }} />
      <details className="lists-ranking-info"><summary>Como as listas são ordenadas</summary><p>Popularidade: pessoas distintas que salvaram nos últimos 30 dias, com mínimo de 3 salvos de terceiros. Empate por publicação mais recente e ID. Sem amostra, mostramos listas recentes. Salvar marca a lista para você; não copia álbuns nem segue o autor.</p></details>
    </> : <ErrorBox message="Filtros de listas inválidos." onRetry={() => setParams({})} />}
  </section>
}
