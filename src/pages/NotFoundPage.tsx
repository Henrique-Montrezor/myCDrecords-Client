import { Link } from 'react-router-dom'

export default function NotFoundPage({ title = 'Página não encontrada.', message = 'O endereço pode ter mudado ou nunca existiu.' }: { title?: string; message?: string }) {
  return <section className="album-page-error">
    <p className="eyebrow">ERRO 404</p>
    <h1>{title}</h1>
    <p>{message}</p>
    <Link className="secondary-button" to="/">Ir para o início</Link>
  </section>
}
