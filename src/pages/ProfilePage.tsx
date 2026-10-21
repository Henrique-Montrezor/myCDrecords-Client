import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import ErrorBox from '../components/ErrorBox'
import FavoriteAlbums from '../components/FavoriteAlbums'
import ListCard from '../components/ListCard'
import ProfileActivity from '../components/ProfileActivity'
import { useSession } from '../contexts/SessionContext'
import { useResource } from '../hooks/useResource'
import { formatRelativeTime } from '../lib/format'
import { ApiError, followUser, getFollowers, getFollowing, getProfile, getUserLists, getUserReviews, isAbortError, unfollowUser } from '../services/api'
import type { ApiReview, ApiUserSummary, PublicProfile } from '../types/api'
import NotFoundPage from './NotFoundPage'

type Tab = 'activity' | 'reviews' | 'lists' | 'followers' | 'following'

const PAGE_SIZE = 10

function UserList({ load, emptyText }: { load: (signal: AbortSignal) => Promise<ApiUserSummary[]>; emptyText: string }) {
  const { resource, reload } = useResource(load, 'list')
  if (resource.status === 'loading') return <p className="loading-copy" role="status">Carregando...</p>
  if (resource.status === 'error') return <ErrorBox message="Não foi possível carregar a lista." onRetry={reload} />
  if (resource.data.length === 0) return <div className="empty-state">{emptyText}</div>
  return <ul className="people-list">{resource.data.map((person) => <li key={person.id}>
    <Link to={`/profile/${encodeURIComponent(person.username)}`}><Avatar url={person.avatar_url} name={person.username} /><strong>{person.username}</strong></Link>
  </li>)}</ul>
}

function UserLists({ userId, isSelf }: { userId: number; isSelf: boolean }) {
  const { resource, reload } = useResource((signal) => getUserLists(userId, signal), String(userId))
  if (resource.status === 'loading') return <p className="loading-copy" role="status">Carregando listas...</p>
  if (resource.status === 'error') return <ErrorBox message="Não foi possível carregar as listas." onRetry={reload} />
  if (resource.data.length === 0) return <div className="empty-state"><p>{isSelf ? 'Você ainda não criou listas.' : 'Nenhuma lista pública por enquanto.'}</p>{isSelf && <Link className="secondary-button" to="/lists">Criar uma lista</Link>}</div>
  return <ul className="list-grid">{resource.data.map((list) => <ListCard key={list.id} list={list} />)}</ul>
}

function UserReviews({ userId }: { userId: number }) {
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the request on retry.
  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    getUserReviews(userId, 1, controller.signal)
      .then((items) => { setReviews(items); setPage(1); setHasMore(items.length === PAGE_SIZE); setStatus('ready') })
      .catch((error: unknown) => { if (!isAbortError(error)) setStatus('error') })
    return () => controller.abort()
  }, [userId, attempt])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const items = await getUserReviews(userId, page + 1)
      setReviews((current) => [...current, ...items])
      setPage((current) => current + 1)
      setHasMore(items.length === PAGE_SIZE)
    } catch {
      setStatus('error')
    } finally {
      setLoadingMore(false)
    }
  }

  if (status === 'loading') return <p className="loading-copy" role="status">Carregando reviews...</p>
  if (status === 'error') return <ErrorBox message="Não foi possível carregar as reviews." onRetry={() => setAttempt((value) => value + 1)} />
  if (reviews.length === 0) return <div className="empty-state">Nenhuma review publicada ainda.</div>

  return <>
    <ul className="profile-reviews">{reviews.map((review) => <li key={review.id}>
      <Link className="profile-review-cover" to={`/albums/${encodeURIComponent(String(review.album_id))}`} aria-label={`Abrir ${review.album_title ?? 'álbum'}`}>
        {review.album_image ? <img src={review.album_image} alt="" loading="lazy" /> : <span />}
      </Link>
      <div>
        <h3><Link to={`/albums/${encodeURIComponent(String(review.album_id))}`}>{review.album_title ?? 'Álbum'}</Link></h3>
        <p className="profile-review-meta">{review.album_artist} <span className="review-stars" role="img" aria-label={`Nota ${review.rating} de 5`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={11} fill={value <= review.rating ? 'currentColor' : 'none'} />)}</span></p>
        {review.text && <p className="profile-review-text">{review.text}</p>}
        <time className="time" dateTime={review.created_at}>{formatRelativeTime(review.created_at)}</time>
      </div>
    </li>)}</ul>
    {hasMore && <button type="button" className="secondary-button review-more" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? 'Carregando...' : 'Ver mais reviews'}</button>}
  </>
}

function ProfileView({ initial }: { initial: PublicProfile }) {
  const [profile, setProfile] = useState(initial)
  const [tab, setTab] = useState<Tab>('activity')
  const [followError, setFollowError] = useState('')
  const [pending, setPending] = useState(false)

  async function toggleFollow() {
    if (pending) return
    const previous = profile
    const following = !previous.is_following
    setProfile({ ...previous, is_following: following, followers: previous.followers + (following ? 1 : -1) })
    setFollowError('')
    setPending(true)
    try {
      if (following) await followUser(previous.id)
      else await unfollowUser(previous.id)
    } catch (error) {
      // 409 means the follow already exists, so the optimistic state is already right.
      if (!(error instanceof ApiError && error.status === 409)) {
        setProfile(previous)
        setFollowError('Não foi possível atualizar. Tente novamente.')
      }
    } finally {
      setPending(false)
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'activity', label: 'Atividade' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'lists', label: 'Listas' },
    { id: 'followers', label: 'Seguidores' },
    { id: 'following', label: 'Seguindo' },
  ]

  const stats = [
    { label: profile.reviews === 1 ? 'Review' : 'Reviews', value: profile.reviews, tab: 'reviews' as const },
    { label: profile.followers === 1 ? 'Seguidor' : 'Seguidores', value: profile.followers, tab: 'followers' as const },
    { label: 'Seguindo', value: profile.following, tab: 'following' as const },
  ]

  return <>
    {profile.banner_url && <div className="profile-backdrop" aria-hidden="true"><div className="profile-backdrop-image" style={{ backgroundImage: `url("${profile.banner_url}")` }} /></div>}
    <header className={profile.banner_url ? 'profile-hero profile-hero--banner' : 'profile-hero'}>
      <div className="profile-hero-grooves" aria-hidden="true" />
      <Avatar url={profile.avatar_url} name={profile.username} size={104} />
      <div className="profile-heading">
        <p className="eyebrow">PERFIL</p>
        <h1>{profile.username}</h1>
        <p className="profile-bio">{profile.bio || (profile.is_self ? 'Você ainda não escreveu uma bio.' : 'Sem bio por enquanto.')}</p>
        <ul className="profile-stats" aria-label="Números do perfil">
          {stats.map((stat) => <li key={stat.tab}><button type="button" onClick={() => setTab(stat.tab)}><strong>{stat.value}</strong><span>{stat.label}</span></button></li>)}
        </ul>
      </div>
      <div className="profile-actions">
        {profile.is_self
          ? <Link className="secondary-button" to="/settings/profile">Editar perfil</Link>
          : <button type="button" className={profile.is_following ? 'secondary-button' : 'primary-button'} onClick={() => void toggleFollow()} aria-pressed={profile.is_following} disabled={pending}>{profile.is_following ? 'Seguindo' : 'Seguir'}</button>}
        {followError && <p className="form-error" role="alert">{followError}</p>}
      </div>
    </header>

    <FavoriteAlbums userId={profile.id} username={profile.username} isSelf={profile.is_self} />

    <div className="profile-tabs" role="tablist" aria-label="Seções do perfil">
      {tabs.map(({ id, label }) => <button type="button" key={id} role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls="profile-panel" className={tab === id ? 'profile-tab profile-tab--active' : 'profile-tab'} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    <div id="profile-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
      {tab === 'activity' && <ProfileActivity userId={profile.id} username={profile.username} isSelf={profile.is_self} />}
      {tab === 'reviews' && <UserReviews userId={profile.id} />}
      {tab === 'lists' && <UserLists userId={profile.id} isSelf={profile.is_self} />}
      {tab === 'followers' && <UserList key="followers" load={(signal) => getFollowers(profile.id, signal)} emptyText="Ninguém segue este perfil ainda." />}
      {tab === 'following' && <UserList key="following" load={(signal) => getFollowing(profile.id, signal)} emptyText="Este perfil ainda não segue ninguém." />}
    </div>
  </>
}

export default function ProfilePage() {
  const { username = '' } = useParams()
  const { user } = useSession()
  const { resource, reload } = useResource((signal) => getProfile(username, signal), `${username}:${user?.id}`)

  if (resource.status === 'loading') return <p className="loading-copy" role="status">Carregando perfil...</p>
  if (resource.status === 'error') {
    if (resource.error instanceof ApiError && resource.error.status === 404) return <NotFoundPage title="Perfil não encontrado." message="Esta pessoa não existe ou mudou de nome." />
    return <ErrorBox message="Não foi possível carregar este perfil." onRetry={reload} />
  }
  return <ProfileView key={resource.data.id} initial={resource.data} />
}
