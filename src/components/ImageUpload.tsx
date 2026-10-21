import { ImagePlus, Trash2 } from 'lucide-react'
import { type ChangeEvent, type ReactNode, useRef, useState } from 'react'
import { ACCEPTED_IMAGE_TYPES, prepareImage } from '../lib/image'
import { removeProfileImage, type ProfileImageKind, uploadProfileImage } from '../services/api'

const SIZES: Record<ProfileImageKind, [number, number]> = { avatar: [512, 512], banner: [1600, 480] }

export default function ImageUpload({ kind, label, hint, hasImage, onChange, children }: {
  kind: ProfileImageKind
  label: string
  hint: string
  hasImage: boolean
  onChange: (url: string | null) => void
  children: ReactNode
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const [width, height] = SIZES[kind]
      const { url } = await uploadProfileImage(kind, await prepareImage(file, width, height))
      onChange(url)
    } catch (failure) {
      setError(failure instanceof Error && !('status' in failure) ? failure.message : 'Não foi possível enviar a imagem. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    setBusy(true)
    setError('')
    try {
      await removeProfileImage(kind)
      onChange(null)
    } catch {
      setError('Não foi possível remover a imagem. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return <div className={`image-upload image-upload--${kind}`}>
    {children}
    <div className="image-upload-controls">
      <strong>{label}</strong>
      <span className="field-hint">{hint}</span>
      <div className="image-upload-actions">
        <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} onChange={(event) => void handleFile(event)} hidden aria-label={label} />
        <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()} disabled={busy}><ImagePlus size={16} /> {busy ? 'Enviando...' : hasImage ? 'Trocar imagem' : 'Escolher imagem'}</button>
        {hasImage && <button type="button" className="text-button" onClick={() => void handleRemove()} disabled={busy}><Trash2 size={14} /> Remover</button>}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  </div>
}
