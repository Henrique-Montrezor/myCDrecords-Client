import { useState } from 'react'
import { Link } from 'react-router-dom'
import { saveRecommendationEngine } from '../services/api'
import type { RecommendationEnginePreference, RecommendationML } from '../types/api'
import ErrorBox from './ErrorBox'

export function RecommendationModelStatus({ model }: { model?: RecommendationML }) {
  if (!model) return null
  return <div className="recommendation-model-status" role="status">
    <p>Treinado com perfis fictícios, sem qualidade real comprovada.</p>
    {model.status === 'active'
      ? <p>Modelo PyTorch ativo: {model.modelVersion}.</p>
      : <><p>{model.status === 'cold_start' ? 'Sem sinais positivos de artistas suportados.' : 'Sem álbuns inéditos compatíveis no catálogo local.'}</p>
        <p>Exibindo o motor original, não o ranking ML.</p></>}
  </div>
}

export default function RecommendationModelControl({ enabled, onSaved, settings = false }: {
  enabled: boolean
  onSaved: (preference: RecommendationEnginePreference) => void
  settings?: boolean
}) {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save(next: boolean) {
    setPending(true)
    setFailed(false)
    setSaved(false)
    try {
      const preference = await saveRecommendationEngine(next)
      setSaved(true)
      onSaved(preference)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  if (enabled && !settings) return null
  return <section className="recommendation-model" aria-label="Modelo de recomendações">
    <p className="eyebrow">LADO B · ML EXPERIMENTAL</p>
    <p>Treinado com perfis fictícios, sem qualidade real comprovada.</p>
    <p>Usa suas notas, favoritos e artistas escolhidos apenas na inferência privada, sem retreinar nem salvar seu vetor. Não usa Spotify. A escolha fica salva na sua conta; você pode desativar nas configurações. Isso não autoriza coleta para treinamento.</p>
    <label className="pilot-acknowledgement">
      <input type="checkbox" checked={enabled} disabled={pending} onChange={(event) => void save(event.target.checked)} />
      Usar ML experimental no meu feed
    </label>
    <p role="status">{pending ? 'Salvando escolha...' : saved ? 'Escolha salva na sua conta.' : ''}</p>
    {failed && <ErrorBox message="Não foi possível salvar a escolha do modelo." onRetry={() => void save(!enabled)} />}
    <Link to="/recommendations">Editar meu gosto em Para você</Link>
  </section>
}
