import { useEffect, useRef } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import type { RecommendationML } from '../types/api'

export default function RecommendationModelControl({ model }: { model?: RecommendationML }) {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)
  const enabled = params.get('engine') === 'ml'
  useEffect(() => {
    const state: unknown = location.state
    if (typeof state === 'object' && state !== null && 'focusRecommendationModel' in state && state.focusRecommendationModel === true) {
      inputRef.current?.focus()
    }
  }, [location.state])
  return <section className="recommendation-model" aria-label="Modelo de recomendações">
    <p className="eyebrow">LADO B · ML EXPERIMENTAL</p>
    <p>Treinado com perfis fictícios, sem qualidade real comprovada.</p>
    <p>Usa suas notas, favoritos e artistas escolhidos apenas na inferência privada, sem retreinar nem salvar seu vetor. Não usa Spotify. A escolha fica no endereço desta página.</p>
    <label className="pilot-acknowledgement">
      <input ref={inputRef} type="checkbox" checked={enabled} onChange={(event) => {
        const next = new URLSearchParams(params)
        if (event.target.checked) next.set('engine', 'ml')
        else next.delete('engine')
        setParams(next, { state: { focusRecommendationModel: true } })
      }} />
      Usar ML experimental no meu feed
    </label>
    {enabled && model && <div role="status">
      {model.status === 'active'
        ? <p>Modelo PyTorch ativo: {model.modelVersion}.</p>
        : <><p>{model.status === 'cold_start' ? 'Sem sinais positivos de artistas suportados.' : 'Sem álbuns inéditos compatíveis no catálogo local.'}</p>
          <p>Exibindo o motor original, não o ranking ML.</p></>}
    </div>}
    <Link to={`/recommendations${enabled ? '?engine=ml' : ''}`}>Editar meu gosto em Para você</Link>
    {enabled && <Link to="/?engine=ml">Ver minhas sugestões ML no feed</Link>}
    {enabled && model && <details>
      <summary>Artistas desta versão</summary>
      <p>{model.supportedArtists.join(' · ')}</p>
      <p>Escolha artistas nas preferências ou avalie discos deles. Nomes não listados e preferências só de estilos ainda não alimentam este modelo.</p>
    </details>}
  </section>
}
