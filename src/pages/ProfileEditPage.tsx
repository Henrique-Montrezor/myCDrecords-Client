import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import ImageUpload from '../components/ImageUpload'
import { useSession } from '../contexts/SessionContext'
import { useResource } from '../hooks/useResource'
import { ApiError, getProfile, updateProfile } from '../services/api'
import type { PublicProfile } from '../types/api'

const MAX_BIO = 1000

function ProfileForm({ profile }: { profile: PublicProfile }) {
  const navigate = useNavigate()
  const { setAvatarUrl: setSessionAvatar } = useSession()
  const [bio, setBio] = useState(profile.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [bannerUrl, setBannerUrl] = useState(profile.banner_url ?? '')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await updateProfile({ bio: bio.trim(), avatar_url: avatarUrl })
      setSessionAvatar(avatarUrl || null)
      navigate(`/profile/${encodeURIComponent(profile.username)}`)
    } catch (submissionError) {
      setError(submissionError instanceof ApiError && submissionError.status === 400 ? 'Confira a bio.' : 'Não foi possível salvar agora. Tente novamente.')
      setIsSubmitting(false)
    }
  }

  return <form className="profile-form" onSubmit={handleSubmit}>
    <ImageUpload kind="banner" label="Banner" hint="Imagem larga, de preferência 1600 x 480. A imagem é enviada na hora." hasImage={Boolean(bannerUrl)} onChange={(url) => setBannerUrl(url ?? '')}>
      <div className="banner-preview" role="img" aria-label={bannerUrl ? 'Prévia do banner' : 'Sem banner'} style={bannerUrl ? { backgroundImage: `url("${bannerUrl}")` } : undefined} />
    </ImageUpload>
    <ImageUpload kind="avatar" label="Foto de perfil" hint="Quadrada fica melhor. A imagem é enviada na hora." hasImage={Boolean(avatarUrl)} onChange={(url) => { setAvatarUrl(url ?? ''); setSessionAvatar(url) }}>
      <div className="profile-form-preview"><Avatar key={avatarUrl} url={avatarUrl || null} name={profile.username} size={72} /></div>
    </ImageUpload>
    <label>Bio
      <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={5} maxLength={MAX_BIO} placeholder="Conte o que você gosta de ouvir." disabled={isSubmitting} />
      <span className="field-hint">{bio.length}/{MAX_BIO}</span>
    </label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="profile-form-actions">
      <Link className="secondary-button" to={`/profile/${encodeURIComponent(profile.username)}`}>Pular por agora</Link>
      <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar perfil'}</button>
    </div>
  </form>
}

export default function ProfileEditPage() {
  const { user } = useSession()
  const username = user?.username ?? ''
  const { resource, reload } = useResource((signal) => getProfile(username, signal), username)

  return <section className="profile-edit">
    <p className="eyebrow">SEU PERFIL</p>
    <h1 className="page-title">Como as pessoas vão te ver</h1>
    {resource.status === 'loading' && <p className="loading-copy" role="status">Carregando...</p>}
    {resource.status === 'error' && <div className="empty-state" role="alert"><p>Não foi possível carregar seu perfil.</p><button type="button" className="secondary-button" onClick={reload}>Tentar novamente</button></div>}
    {resource.status === 'ready' && <ProfileForm profile={resource.data} />}
  </section>
}
