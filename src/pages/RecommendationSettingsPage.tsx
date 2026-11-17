import { Link } from 'react-router-dom'
import ErrorBox from '../components/ErrorBox'
import RecommendationModelControl from '../components/RecommendationModelControl'
import { useResource } from '../hooks/useResource'
import { getRecommendationEngine } from '../services/api'

export default function RecommendationSettingsPage() {
  const { resource, reload, setResource } = useResource(getRecommendationEngine, 'recommendation-engine')

  return <div className="recs-page">
    <h1 className="page-title">Configurações</h1>
    <div className="recs-tools"><Link className="secondary-button" to="/settings/profile">Editar perfil</Link><Link className="secondary-button" to="/">Voltar ao início</Link></div>
    <h2>Recomendações</h2>
    <p className="recs-intro">Ative ou desative o modelo experimental para sua conta. A mudança vale também após sair e entrar novamente.</p>
    {resource.status === 'loading' && <p className="loading-copy" role="status">Carregando configuração...</p>}
    {resource.status === 'error' && <ErrorBox message="Não foi possível carregar a configuração de recomendações." onRetry={reload} />}
    {resource.status === 'ready' && <RecommendationModelControl settings enabled={resource.data.enabled} onSaved={(data) => setResource({ status: 'ready', data })} />}
  </div>
}
