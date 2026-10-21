import { useState } from 'react'
import { initials } from '../lib/format'

export default function Avatar({ url, name, size = 34 }: { url?: string | null; name?: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size, fontSize: Math.max(10, size / 3) }

  if (url && !failed) return <img className="avatar avatar--image" src={url} alt="" style={style} onError={() => setFailed(true)} />
  return <div className="avatar avatar--green" style={style} aria-hidden="true">{initials(name)}</div>
}
