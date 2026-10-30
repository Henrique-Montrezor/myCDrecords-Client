import { ArrowDown, ArrowUp } from 'lucide-react'
import { useState } from 'react'

export default function ListOrderControls({ title, position, total, busy, onMove }: {
  title: string; position: number; total: number; busy: boolean; onMove: (position: number) => Promise<void>
}) {
  const [target, setTarget] = useState(String(position))
  return <div className="list-order-controls">
    <div><button type="button" className="secondary-button" aria-label={`Mover ${title} para cima`} disabled={busy || position <= 1} onClick={() => void onMove(position - 1)}><ArrowUp size={16} aria-hidden="true" /> Acima</button>
      <button type="button" className="secondary-button" aria-label={`Mover ${title} para baixo`} disabled={busy || position >= total} onClick={() => void onMove(position + 1)}><ArrowDown size={16} aria-hidden="true" /> Abaixo</button></div>
    <form onSubmit={(event) => {
      event.preventDefault()
      const value = Number(target)
      if (Number.isInteger(value) && value >= 1 && value <= total && value !== position) void onMove(value)
    }}>
      <label>Ir para posição<input type="number" min={1} max={total} step={1} required value={target} onChange={(event) => setTarget(event.target.value)} aria-label={`Nova posição de ${title}`} disabled={busy} /></label>
      <button type="submit" className="secondary-button" disabled={busy || target === String(position)} aria-label={`Mover ${title} para a posição escolhida`}>Mover</button>
    </form>
  </div>
}
