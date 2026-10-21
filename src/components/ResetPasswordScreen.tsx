import { useState } from 'react'
import { ArrowRight, Disc3, Eye, EyeOff } from 'lucide-react'
import { ApiError, resetPassword } from '../services/api'

type ResetPasswordScreenProps = { token: string }

export default function ResetPasswordScreen({ token }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas precisam ser iguais.')
      return
    }

    setIsSubmitting(true)
    try {
      await resetPassword(token, password, confirmPassword)
      setSuccess(true)
    } catch (submissionError) {
      if (submissionError instanceof ApiError) setError(submissionError.message)
      else setError('Não foi possível redefinir sua senha. Solicite um novo link.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page reset-page">
      <div className="auth-atmosphere auth-atmosphere--one" />
      <div className="auth-atmosphere auth-atmosphere--two" />
      <section className="auth-intro">
        <div className="brand auth-brand"><span className="brand-mark"><Disc3 size={18} /></span><span>myCD<span className="brand-accent">records</span></span></div>
        <p className="eyebrow">SEU ARQUIVO MUSICAL</p>
        <h1>Volte a<br /><em>escutar.</em></h1>
        <p className="auth-description">Escolha uma nova senha e continue guardando os discos que fazem parte da sua história.</p>
      </section>
      <section className="auth-panel" aria-labelledby="reset-title">
        {success ? <div className="reset-success"><p className="eyebrow">SENHA ATUALIZADA</p><h2 id="reset-title">Tudo certo por aqui.</h2><p>Sua senha foi redefinida. Agora você já pode entrar novamente na sua conta.</p><button type="button" className="auth-submit" onClick={() => { window.location.href = '/' }}>Voltar para entrar <ArrowRight size={17} /></button></div> : <>
          <div className="auth-heading auth-heading--compact"><p className="eyebrow">NOVA CREDENCIAL</p><h2 id="reset-title">Defina sua nova senha.</h2><p>Use pelo menos 8 caracteres para proteger sua conta.</p></div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>Nova senha<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="pelo menos 8 caracteres" minLength={8} required autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            <label>Confirmar senha<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="repita sua senha" minLength={8} required autoComplete="new-password" /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar nova senha'}<ArrowRight size={17} /></button>
          </form>
        </>}
        <p className="auth-legal">O link de recuperação expira por segurança.</p>
      </section>
    </main>
  )
}
