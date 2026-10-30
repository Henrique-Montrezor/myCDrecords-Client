import { ImagePlus, Trash2 } from 'lucide-react'
import { type ChangeEvent, type ReactNode, useRef, useState } from 'react'
import { ACCEPTED_IMAGE_TYPES, prepareImage } from '../lib/image'
import { removeProfileImage, type ProfileImageKind, uploadProfileImage } from '../services/api'

const SIZES: Record<ProfileImageKind, [number, number]> = { avatar: [512, 512], banner: [1600, 480] }

export default function ImageUpload({ kind, label, hint, hasImage, onChange, children, actions, disabled = false, onBusy }: {
  kind: ProfileImageKind
  label: string
  hint: string
  hasImage: boolean
  onChange: (url: string | null) => void
  children: ReactNode
  actions?: { upload: (image: Blob) => Promise<{ url: string }>; remove: () => Promise<void> }
  disabled?: boolean
  onBusy?: (busy: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    onBusy?.(true)
    setError('')
    try {
      const [width, height] = SIZES[kind]
      const image = await prepareImage(file, width, height)
      const { url } = await (actions ? actions.upload(image) : uploadProfileImage(kind, image))
      onChange(url)
    } catch (failure) {
      setError(failure instanceof Error && (actions || !('status' in failure)) ? failure.message : 'Não foi possível enviar a imagem. Tente novamente.')
    } finally {
      setBusy(false)
      onBusy?.(false)
    }
  }

  async function handleRemove() {
    setBusy(true)
    onBusy?.(true)
    setError('')
    try {
      if (actions) await actions.remove()
      else await removeProfileImage(kind)
      onChange(null)
    } catch {
      setError('Não foi possível remover a imagem. Tente novamente.')
    } finally {
      setBusy(false)
      onBusy?.(false)
    }
  }

  return <div className={`image-upload image-upload--${kind}`} aria-busy={busy}>
    {children}
    <div className="image-upload-controls">
      <strong>{label}</strong>
      <span className="field-hint">{hint}</span>
      <div className="image-upload-actions">
        <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} onChange={(event) => void handleFile(event)} hidden aria-label={label} />
        <button type="button" className="secondary-button" aria-label={`${hasImage ? 'Trocar' : 'Escolher'} ${label.toLowerCase()}`} onClick={() => inputRef.current?.click()} disabled={busy || disabled}><ImagePlus size={16} /> {busy ? 'Atualizando...' : hasImage ? 'Trocar imagem' : 'Escolher imagem'}</button>
        {hasImage && <button type="button" className="text-button" aria-label={`Remover ${label.toLowerCase()}`} onClick={() => void handleRemove()} disabled={busy || disabled}><Trash2 size={14} /> Remover</button>}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <span className="sr-only" role="status">{busy ? 'Atualizando imagem...' : ''}</span>
    </div>
  </div>
}
