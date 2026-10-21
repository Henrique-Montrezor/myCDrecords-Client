import { Disc3, RotateCw } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import AuthScreen from './AuthScreen'

export default function SessionGate() {
  const { status, retry } = useSession()

  if (status === 'loading') return <div className="session-loading" role="status"><div className="brand-mark"><Disc3 size={18} /></div><span>Preparando seu arquivo...</span></div>
  if (status === 'unavailable') return <div className="session-loading" role="alert">
    <div className="brand-mark"><Disc3 size={18} /></div>
    <span>Não foi possível conectar ao servidor agora.</span>
    <button type="button" className="secondary-button" onClick={retry}><RotateCw size={16} /> Tentar novamente</button>
  </div>
  if (status === 'anonymous') return <AuthScreen />
  return <Outlet />
}
