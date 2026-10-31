import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
}

export function StarRating({ rating, maxRating = 5, size = 'sm' }: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const iconClass = sizeClasses[size] || sizeClasses.sm

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${rating} out of ${maxRating} stars`}
    >
      {Array.from({ length: maxRating }, (_, i) => {
        const filled = i < Math.round(rating)
        return (
          <Star
            key={i}
            className={`${iconClass} ${
              filled ? 'fill-amber-400 text-amber-400' : 'fill-muted/30 text-muted-foreground/30'
            }`}
          />
        )
      })}
    </div>
  )
}
