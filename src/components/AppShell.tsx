import { Compass, Disc3, Home, ListMusic, LogOut, Menu, Search, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import Avatar from './Avatar'
import EmailVerificationBanner from './EmailVerificationBanner'

const navItems = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/search', label: 'Descobrir', icon: Compass, end: false },
  { to: '/lists', label: 'Listas', icon: ListMusic, end: false },
]

export default function AppShell() {
  const { user, avatarUrl, signOut } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const onSearchPage = location.pathname === '/search'
  const query = onSearchPage ? params.get('q') ?? '' : ''
  const [value, setValue] = useState(query)

  useEffect(() => setValue(query), [query])

  useEffect(() => {
    if (value === query) return
    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams()
      if (value) next.set('q', value)
      const tab = params.get('tab')
      if (onSearchPage && value && tab) next.set('tab', tab)
      const search = next.toString()
      navigate({ pathname: '/search', search: search ? `?${search}` : '' }, { replace: onSearchPage })
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [value, query, onSearchPage, navigate, params])

  // biome-ignore lint/correctness/useExhaustiveDependencies: closes the mobile menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [location.pathname])

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  return (
    <div className="app-shell">
      <aside className={menuOpen ? 'sidebar sidebar--open' : 'sidebar'}>
        <div className="brand"><span className="brand-mark"><Disc3 size={18} /></span><span>myCD<span className="brand-accent">records</span></span></div>
        <button type="button" className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={20} /></button>
        <nav className="main-nav" aria-label="Navegação principal">
          <span className="nav-label">Seu espaço</span>
          {navItems.map(({ to, label, icon: Icon, end }) => <NavLink className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'} to={to} end={end} key={to}><Icon size={18} />{label}</NavLink>)}
          <NavLink className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'} to={`/profile/${encodeURIComponent(user?.username ?? '')}`}><UserRound size={18} />Meu perfil</NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-mini">
            <Avatar url={avatarUrl} name={user?.username} />
            <div><strong>{user?.username}</strong><span>{user?.email}</span></div>
            <button type="button" className="icon-button" onClick={() => void signOut()} aria-label="Sair da conta"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button type="button" className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={22} /></button>
          <div className="search-wrap">
            <Search size={18} />
            <input ref={searchRef} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setValue('') }} placeholder="Buscar álbuns, artistas, faixas..." aria-label="Buscar" />
            {value && <button type="button" className="clear-search" onClick={() => { setValue(''); searchRef.current?.focus() }} aria-label="Limpar busca"><X size={15} /></button>}
            <kbd>Ctrl K</kbd>
          </div>
        </header>
        <div className="content-wrap"><EmailVerificationBanner /><Outlet /></div>
      </main>
    </div>
  )
}
