import { useId, useState } from 'react'
import { useResource } from '../hooks/useResource'
import { getRecommendationPilotNotice, getRecommendationPilotParticipation, joinRecommendationPilot, withdrawRecommendationPilot } from '../services/api'
import ErrorBox from './ErrorBox'

function PilotControls() {
  const notice = useResource(getRecommendationPilotNotice, 'pilot-notice')
  const participation = useResource(getRecommendationPilotParticipation, 'pilot-participation')
  const [acceptedVersion, setAcceptedVersion] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const checkboxId = useId()
  const terms = notice.resource.status === 'ready' ? notice.resource.data : null
  const status = participation.resource.status === 'ready' ? participation.resource.data : null
  const loadError = notice.resource.status === 'error' || participation.resource.status === 'error'
  const loading = notice.resource.status === 'loading' || participation.resource.status === 'loading'

  async function change(action: 'join' | 'withdraw') {
    if (action === 'join' && (!terms || acceptedVersion !== terms.version)) {
      setError('Leia o aviso e confirme sua autorização antes de participar.')
      return
    }
    setPending(true)
    setError('')
    setMessage('')
    try {
      const result = action === 'join' && terms
        ? await joinRecommendationPilot(terms.version)
        : await withdrawRecommendationPilot()
      participation.setResource((current) => current.status === 'ready'
        ? { status: 'ready', data: { ...current.data, participating: result.participating, noticeVersion: result.participating ? result.noticeVersion : current.data.noticeVersion } }
        : current)
      setAcceptedVersion(null)
      setMessage(result.participating
        ? 'Adesão confirmada. Somente novas notas independentes elegíveis poderão entrar no piloto.'
        : 'Autorização retirada. Seus eventos do piloto foram removidos; suas reviews públicas permanecem.')
    } catch {
      setError(action === 'join'
        ? 'Não foi possível registrar sua adesão. Tente novamente; nenhum aceite foi confirmado.'
        : 'Não foi possível retirar sua autorização. Tente novamente ou use o contato do aviso.')
    } finally {
      setPending(false)
    }
  }

  return <div className="pilot-contents" aria-busy={loading || pending}>
    <p>Participação opcional, separada do cadastro. As sugestões atuais continuam pelo motor existente; este piloto ainda não publica recomendações do modelo.</p>
    {loading && <p role="status">Carregando aviso e participação...</p>}
    {loadError && <ErrorBox message="Não foi possível consultar o piloto. Ele pode estar pausado ou sua sessão pode ter expirado. A retirada continua disponível para sua conta autenticada." onRetry={() => { notice.reload(); participation.reload() }} />}
    {terms && <>
      <p><strong>Finalidade:</strong> {terms.purpose}</p>
      <p>{terms.text}</p>
      <p>{terms.data}</p>
      <p>{terms.retention}</p>
      <p>{terms.receipts}</p>
      <p>{terms.withdrawal}</p>
      <p><strong>Responsável:</strong> {terms.responsible}. <strong>Contato:</strong> {terms.contact}</p>
      <p>Versão do aviso: {terms.version}</p>
    </>}
    {status?.closed && <p>Este piloto foi encerrado. As sugestões atuais continuam disponíveis.</p>}
    {status && !status.closed && !status.invited && <p>O piloto é restrito a contas convidadas. Não é preciso participar para usar o aplicativo.</p>}
    {status?.participating && <p>Você participa do piloto. Notas anteriores à sua adesão não são importadas.</p>}
    {terms && status?.invited && !status.closed && !status.participating && <form onSubmit={(event) => { event.preventDefault(); void change('join') }}>
      <label className="pilot-acknowledgement" htmlFor={checkboxId}>
        <input id={checkboxId} type="checkbox" required disabled={pending} checked={acceptedVersion === terms.version} onChange={(event) => setAcceptedVersion(event.target.checked ? terms.version : null)} />
        <span>Li o aviso e autorizo o uso das minhas novas notas neste piloto opcional.</span>
      </label>
      <button type="submit" className="secondary-button" disabled={pending || acceptedVersion !== terms.version}>{pending ? 'Registrando...' : 'Participar do piloto'}</button>
    </form>}
    {(status?.participating || participation.resource.status === 'error') && <button type="button" className="secondary-button" disabled={pending} onClick={() => void change('withdraw')}>{pending ? 'Aguarde...' : 'Retirar autorização'}</button>}
    {error && <p role="alert">{error}</p>}
    <p role="status">{message}</p>
  </div>
}

export default function RecommendationPilotPanel() {
  const [open, setOpen] = useState(false)
  return <details className="recs-about pilot-panel" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>Piloto de recomendações com ML</summary>
    {open && <PilotControls />}
  </details>
}
