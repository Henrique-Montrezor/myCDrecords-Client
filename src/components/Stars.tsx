import { Star } from 'lucide-react'

export default function Stars({ rating }: { rating: number }) {
  return <span className="review-stars" role="img" aria-label={`Nota ${rating} de 5`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={11} fill={value <= rating ? 'currentColor' : 'none'} />)}</span>
}
