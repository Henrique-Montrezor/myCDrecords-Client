import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Disc3, Eye, EyeOff } from 'lucide-react'
import { ApiError, requestPasswordReset } from '../services/api'
import { useSession } from '../contexts/SessionContext'

type AuthMode = 'login' | 'register' | 'forgot'

export default function AuthScreen() {
  const { signIn, signUp } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setNotice('')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (mode === 'register' && password !== confirmPassword) {
      setError('As senhas precisam ser iguais.')
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'login') await signIn(email, password)
      else if (mode === 'register') {
        // Move to onboarding before the session flips, so the home never mounts (and fetches) for a frame.
        const previousPath = `${location.pathname}${location.search}`
        navigate('/settings/profile', { replace: true })
        try {
          await signUp(username, email, password, confirmPassword)
        } catch (signUpError) {
          navigate(previousPath, { replace: true })
          throw signUpError
        }
      }
      else {
        const response = await requestPasswordReset(email)
        setNotice(response.message)
      }
    } catch (submissionError) {
      if (submissionError instanceof ApiError) setError(submissionError.message)
      else if (submissionError instanceof Error) setError(submissionError.message)
      else setError('Não foi possível concluir agora. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-atmosphere auth-atmosphere--one" />
      <div className="auth-atmosphere auth-atmosphere--two" />
      <section className="auth-intro">
        <div className="brand auth-brand"><span className="brand-mark"><Disc3 size={18} /></span><span>myCD<span className="brand-accent">records</span></span></div>
        <p className="eyebrow">SEU ARQUIVO MUSICAL</p>
        <h1>Ouça com<br /><em>intenção.</em></h1>
        <p className="auth-description">Descubra discos, registre o que sentiu e encontre pessoas que escutam com a mesma curiosidade.</p>
        <div className="auth-note"><span>“</span><p>Um lugar para guardar os álbuns que ficam.</p></div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-tabs"><button type="button" className={mode === 'login' ? 'auth-tab auth-tab--active' : 'auth-tab'} onClick={() => changeMode('login')}>Entrar</button><button type="button" className={mode === 'register' ? 'auth-tab auth-tab--active' : 'auth-tab'} onClick={() => changeMode('register')}>Criar conta</button></div>
        <div className="auth-heading"><p className="eyebrow">{mode === 'login' ? 'BEM-VINDO DE VOLTA' : mode === 'register' ? 'COMECE SUA COLEÇÃO' : 'RECUPERE O ACESSO'}</p><h2 id="auth-title">{mode === 'login' ? 'Entre na sua conta.' : mode === 'register' ? 'Crie seu espaço.' : 'Esqueceu sua senha?'}</h2><p>{mode === 'login' ? 'Continue de onde sua última escuta parou.' : mode === 'register' ? 'Leva menos de um minuto para começar.' : 'Enviaremos as instruções para o seu email.'}</p></div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && <label>Nome de usuário<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="como você quer ser chamado" minLength={3} required autoComplete="username" /></label>}
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" required autoComplete="email" /></label>
          {mode !== 'forgot' && <label>Senha<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'register' ? 'pelo menos 8 caracteres' : 'sua senha'} minLength={mode === 'register' ? 8 : 1} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>}
          {mode === 'register' && <label>Confirmar senha<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="repita sua senha" minLength={8} required autoComplete="new-password" /></label>}
          {mode === 'login' && <button type="button" className="forgot-button" onClick={() => changeMode('forgot')}>Esqueci minha senha</button>}
          {mode === 'forgot' && <button type="button" className="forgot-button" onClick={() => changeMode('login')}>Voltar para entrar</button>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-notice" role="status">{notice}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enviando...' : mode === 'login' ? 'Entrar na minha conta' : mode === 'register' ? 'Criar minha conta' : 'Enviar instruções'}<ArrowRight size={17} /></button>
        </form>
        <p className="auth-legal">Ao continuar, você concorda com os termos de uso do myCDrecords.</p>
      </section>
    </main>
  )
}
