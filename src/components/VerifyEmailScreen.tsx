import { ArrowRight, Disc3 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import { verifyEmail } from '../services/api'

type Status = 'verifying' | 'success' | 'error'

export default function VerifyEmailScreen({ token }: { token: string }) {
  const { status: sessionStatus, markEmailVerified } = useSession()
  const [status, setStatus] = useState<Status>('verifying')
  // Tokens are single use, so StrictMode's second effect run must reuse the first request.
  const pending = useRef<{ token: string; request: Promise<unknown> } | null>(null)

  useEffect(() => {
    let active = true
    if (pending.current?.token !== token) pending.current = { token, request: verifyEmail(token) }
    pending.current.request
      .then(() => {
        if (!active) return
        markEmailVerified()
        setStatus('success')
      })
      .catch(() => { if (active) setStatus('error') })
    return () => { active = false }
  }, [token, markEmailVerified])

  useEffect(() => {
    const previous = document.title
    document.title = 'Confirmar email | myCDrecords'
    return () => { document.title = previous }
  }, [])

  const destination = sessionStatus === 'authenticated' ? 'Ir para o início' : 'Entrar na minha conta'

  return (
    <main className="auth-page reset-page">
      <div className="auth-atmosphere auth-atmosphere--one" />
      <div className="auth-atmosphere auth-atmosphere--two" />
      <section className="auth-intro">
        <div className="brand auth-brand"><span className="brand-mark"><Disc3 size={18} /></span><span>myCD<span className="brand-accent">records</span></span></div>
        <p className="eyebrow">SEU ARQUIVO MUSICAL</p>
        <h1>Quase<br /><em>pronto.</em></h1>
        <p className="auth-description">Confirmar o email protege sua conta e permite recuperar o acesso quando precisar.</p>
      </section>
      <section className="auth-panel" aria-labelledby="verify-title" aria-live="polite">
        {status === 'verifying' && <div className="auth-heading auth-heading--compact" role="status"><p className="eyebrow">VERIFICANDO</p><h2 id="verify-title">Confirmando seu email...</h2></div>}
        {status === 'success' && <div className="reset-success"><p className="eyebrow">EMAIL CONFIRMADO</p><h2 id="verify-title">Tudo certo por aqui.</h2><p>Seu email foi confirmado.</p><Link className="auth-submit" to="/">{destination} <ArrowRight size={17} /></Link></div>}
        {status === 'error' && <div className="reset-success" role="alert"><p className="eyebrow">LINK INVÁLIDO</p><h2 id="verify-title">Não foi possível confirmar.</h2><p>O link expirou ou já foi usado. Entre na sua conta e peça um novo link no aviso do topo da página.</p><Link className="auth-submit" to="/">{destination} <ArrowRight size={17} /></Link></div>}
        <p className="auth-legal">O link de confirmação vale por 24 horas.</p>
      </section>
    </main>
  )
}
