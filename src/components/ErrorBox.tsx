import { RotateCw } from 'lucide-react'

export default function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="empty-state" role="alert"><p>{message}</p><button type="button" className="secondary-button" onClick={onRetry}><RotateCw size={16} /> Tentar novamente</button></div>
}
