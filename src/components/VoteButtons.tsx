import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { removeReviewVote, voteReview } from '../services/api'

type VoteState = { score: number; userVote: 1 | -1 | null }

export default function VoteButtons({ reviewId, score, userVote, disabled = false }: { reviewId: number; score: number; userVote: 1 | -1 | null; disabled?: boolean }) {
  const [state, setState] = useState<VoteState>({ score, userVote })
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)

  async function toggle(value: 1 | -1) {
    if (pending) return
    const previous = state
    const next: VoteState = previous.userVote === value
      ? { score: previous.score - value, userVote: null }
      : { score: previous.score - (previous.userVote ?? 0) + value, userVote: value }
    setState(next)
    setError(false)
    setPending(true)
    try {
      const result = previous.userVote === value ? await removeReviewVote(reviewId) : await voteReview(reviewId, value)
      setState({ score: result.score, userVote: result.userVote })
    } catch {
      setState(previous)
      setError(true)
    } finally {
      setPending(false)
    }
  }

  return <div className="vote-buttons">
    <button type="button" className={state.userVote === 1 ? 'vote-button vote-button--active' : 'vote-button'} onClick={() => void toggle(1)} disabled={disabled} aria-pressed={state.userVote === 1} aria-label="Útil"><ThumbsUp size={14} /></button>
    <span className="vote-score"><span className="sr-only">Pontuação </span>{state.score}</span>
    <button type="button" className={state.userVote === -1 ? 'vote-button vote-button--active' : 'vote-button'} onClick={() => void toggle(-1)} disabled={disabled} aria-pressed={state.userVote === -1} aria-label="Não útil"><ThumbsDown size={14} /></button>
    {error && <span className="vote-error" role="alert">Não foi possível votar.</span>}
  </div>
}
