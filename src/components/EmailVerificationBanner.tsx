import { MailWarning, X } from 'lucide-react'
import { useState } from 'react'
import { useSession } from '../contexts/SessionContext'
import { ApiError, resendEmailVerification } from '../services/api'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function EmailVerificationBanner() {
  const { user, markEmailVerified } = useSession()
  const [status, setStatus] = useState<Status>('idle')
  const [dismissed, setDismissed] = useState(false)

  if (user?.emailVerified !== false || dismissed) return null

  async function resend() {
    setStatus('sending')
    try {
      await resendEmailVerification()
      setStatus('sent')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) markEmailVerified()
      else setStatus('error')
    }
  }

  return <section className="verify-banner" aria-label="Confirmação de email">
    <MailWarning size={18} aria-hidden="true" />
    <p>
      {status === 'sent'
        ? <>Enviamos um novo link para <strong>{user.email}</strong>.</>
        : <>Confirme seu email <strong>{user.email}</strong> pelo link que enviamos.</>}
      <span role="status" className={status === 'error' ? 'verify-banner-error' : 'sr-only'}>{status === 'error' ? ' Não foi possível reenviar. Tente novamente.' : status === 'sent' ? 'Link reenviado.' : ''}</span>
    </p>
    {status !== 'sent' && <button type="button" className="text-button" onClick={() => void resend()} disabled={status === 'sending'}>{status === 'sending' ? 'Enviando...' : 'Reenviar link'}</button>}
    <button type="button" className="icon-button" onClick={() => setDismissed(true)} aria-label="Fechar aviso de confirmação"><X size={16} /></button>
  </section>
}
