import { ChevronRight, Disc3, RotateCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import AlbumCard from '../components/AlbumCard'
import HomeFeed from '../components/HomeFeed'
import HomeRecommendations from '../components/HomeRecommendations'
import { useSession } from '../contexts/SessionContext'
import { useTrendingAlbums } from '../hooks/useTrendingAlbums'

const todayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

export default function HomePage() {
  const { user } = useSession()
  const trending = useTrendingAlbums()
  const featured = trending.albums[0]

  return <>
    <section className="welcome-row"><div><p className="eyebrow">{todayFormat.format(new Date()).toUpperCase()}</p><h1>Olá, {user?.username}.<br /><em>O que vai tocar hoje?</em></h1></div></section>

    <section className="hero-feature" aria-label="Álbum em destaque">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="live-dot" /> Em destaque</div>
        <h2>{featured?.title ?? 'Descubra o próximo disco.'}</h2>
        <p>{featured ? `${featured.artist}, ${featured.year}.` : 'Busque álbuns e artistas para começar a sua coleção.'}</p>
        <Link className="hero-action" to={featured?.link ?? '/search'}>{featured ? 'Abrir álbum' : 'Explorar'} <ChevronRight size={16} /></Link>
      </div>
      <div className="hero-record" aria-hidden="true">
        <div className="hero-disc">{featured?.cover ? <img src={featured.cover} alt="" /> : <Disc3 size={96} />}</div>
        <div className="record-label">myCD<br /><span>{String(new Date().getFullYear()).slice(2)}</span></div>
      </div>
      <div className="hero-wave" />
    </section>

    <HomeRecommendations />
    <HomeFeed />


    <section className="section">
      <div className="section-heading"><div><p className="eyebrow">DESCOBRIR</p><h2>Lançamentos do ano</h2></div><Link className="text-button" to="/discover">Explorar catálogo <ChevronRight size={15} /></Link></div>
      {trending.status === 'loading' && <p className="loading-copy" role="status">Buscando novidades...</p>}
      {trending.status === 'error' && <div className="empty-state" role="alert"><p>Não foi possível carregar os álbuns agora.</p><button type="button" className="secondary-button" onClick={trending.reload}><RotateCw size={16} /> Tentar novamente</button></div>}
      {trending.albums.length > 0 && <div className="album-row">{trending.albums.slice(0, 8).map((album) => <AlbumCard album={album} key={album.id} />)}</div>}
    </section>
  </>
}
