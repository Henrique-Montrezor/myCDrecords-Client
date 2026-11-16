import { Link, useSearchParams } from 'react-router-dom'
import ErrorBox from '../components/ErrorBox'
import { useResource } from '../hooks/useResource'
import { ApiError, getRecommendationLab } from '../services/api'
import type { RecommendationLabItem } from '../types/api'

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const albumLabel = (id: string) => `Disco sintético ${id.slice(-2)}`

function Ranking({ id, title, items, target }: { id: string; title: string; items: RecommendationLabItem[]; target: string }) {
  return <section className="ml-lab-ranking" aria-labelledby={id}>
    <h2 id={id}>{title}</h2>
    {items.length === 0 ? <p className="empty-state">Nenhum candidato neste ranking.</p>
      : <ol>{items.map((item, index) => <li key={item.albumId}>
        <span className="ml-lab-position" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <div><h3>{albumLabel(item.albumId)}</h3><p>Score: {number.format(item.score)}{item.albumId === target && <strong> · Alvo de teste recuperado</strong>}</p></div>
      </li>)}</ol>}
  </section>
}

export default function RecommendationLabPage() {
  const [params, setParams] = useSearchParams()
  const { resource, reload } = useResource(getRecommendationLab, 'recommendation-lab')
  const snapshot = resource.status === 'ready' ? resource.data : null
  const selected = params.get('profile') ?? snapshot?.profiles[0]?.id
  const profile = snapshot?.profiles.find((item) => item.id === selected)
  const error = resource.status === 'error'
    ? resource.error instanceof ApiError ? resource.error.message : 'Não foi possível acessar o laboratório. Inicie npm run ml:lab na API.'
    : null

  return <main className="content-wrap ml-lab">
    <Link className="text-button" to="/">Voltar ao myCDrecords</Link>
    <header className="ml-lab-header">
      <p className="eyebrow">BANCADA DE TESTES · SOMENTE DESENVOLVIMENTO</p>
      <h1>Laboratório de recomendações</h1>
      <p>Um modelo real, um acervo inventado. Compare o que o PyTorch aprendeu com uma referência por popularidade.</p>
    </header>
    <p className="ml-lab-warning">Todos os perfis e discos são sintéticos. Não mede a qualidade para usuários reais e não altera suas recomendações, notas ou favoritos.</p>
    {resource.status === 'loading' && <p className="loading-copy" role="status">Carregando o treino salvo...</p>}
    {error && <><ErrorBox message={error} onRetry={reload} /><p className="ml-lab-help">Treine pela tarefa “ML: train synthetic snapshot” do VS Code e inicie o laboratório com <code>npm run ml:lab</code> na API.</p></>}
    {snapshot && <>
      <dl className="ml-lab-metrics">
        <div><dt>NDCG@3 · modelo</dt><dd>{number.format(snapshot.evaluation.model.ndcg)}</dd></div>
        <div><dt>NDCG@3 · popularidade</dt><dd>{number.format(snapshot.evaluation.baseline.ndcg)}</dd></div>
        <div><dt>Recall@3 · modelo</dt><dd>{number.format(snapshot.evaluation.model.recall)}</dd></div>
      </dl>
      <div className="ml-lab-training">
        <h2>O que este treino prova</h2>
        <p>Embeddings de usuário e álbum aprendem a ordenar exemplos pela perda BPR. Perda: {number.format(snapshot.training.initialLoss)} → {number.format(snapshot.training.finalLoss)} em {number.format(snapshot.training.epochs)} épocas.</p>
        <p>Teste sintético leave-one-out: um positivo por perfil fica fora do treino. Isso não é uma avaliação temporal nem uma autorização para produção. Scores não são probabilidades.</p>
        <p>PyTorch {snapshot.training.torchVersion} · CPU · {snapshot.modelVersion} · atualizado em {date.format(new Date(snapshot.generatedAt))}.</p>
      </div>
      {!profile ? <div className="empty-state" role="alert">
        <p>{snapshot.profiles.length === 0 ? 'Nenhum perfil sintético disponível.' : 'Perfil sintético não encontrado.'}</p>
        {snapshot.profiles.length > 0 && <button className="secondary-button" type="button" onClick={() => setParams({})}>Selecionar primeiro perfil</button>}
      </div> : <>
        <div className="ml-lab-profile">
          <label htmlFor="ml-lab-profile">Perfil sintético</label>
          <select id="ml-lab-profile" value={profile.id} onChange={(event) => setParams({ profile: event.currentTarget.value })}>
            {snapshot.profiles.map((item) => <option key={item.id} value={item.id}>Perfil sintético {item.id.slice(-2)}</option>)}
          </select>
          <p>Positivos usados no treino: {profile.trainingAlbums.map(albumLabel).join(', ')}.</p>
          <p>Alvo reservado para teste: <strong>{albumLabel(profile.heldOutAlbum)}</strong>. Os positivos do treino são excluídos dos dois rankings.</p>
        </div>
        <div className="ml-lab-rankings">
          <Ranking id="ml-model-ranking" title="Ranking PyTorch" items={profile.recommendations} target={profile.heldOutAlbum} />
          <Ranking id="ml-baseline-ranking" title="Referência por popularidade" items={profile.baseline} target={profile.heldOutAlbum} />
        </div>
        <p className="ml-lab-help">A ordem do modelo vem de fatores latentes aprendidos, não de uma justificativa por gênero. Nenhum conteúdo Spotify ou catálogo externo participa.</p>
      </>}
    </>}
  </main>
}
