import { Disc3 } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import AppShell from './AppShell'
import AuthScreen from './AuthScreen'

export default function PublicListLayout() {
  const { status, retry } = useSession()
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
  useEffect(() => {
    if (status !== 'authenticated' || !params.has('login')) return
    const next = new URLSearchParams(params)
    next.delete('login')
    setParams(next, { replace: true })
  }, [status, params, setParams])
  if (status === 'loading') return <p className="loading-copy" role="status">Preparando a lista...</p>
  if (status === 'authenticated') return <AppShell />
  if (status === 'anonymous' && params.get('login') === '1') return <><Link className="public-list-back secondary-button" to={pathname}>Voltar à lista</Link><AuthScreen /></>
  return <div className="public-list-layout">
    <header><Link className="public-list-brand" to="/"><Disc3 size={24} aria-hidden="true" /> myCDrecords</Link><Link className="secondary-button" to={`${pathname}?login=1`}>Entrar</Link></header>
    <main>
      {status === 'unavailable' && <p className="public-session-error" role="alert">Não foi possível verificar sua sessão. <button type="button" className="text-button" onClick={retry}>Tentar novamente</button></p>}
      <Outlet />
    </main>
  </div>
}
