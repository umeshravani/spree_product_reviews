import { Star } from 'lucide-react'
import { useState } from 'react'

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (rating: number) => void
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'sm',
  interactive = false,
  onChange,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const currentRating = hoverRating !== null ? hoverRating : rating

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const iconClass = sizeClasses[size] || sizeClasses.sm

  if (!interactive || !onChange) {
    return (
      <div
        className="inline-flex items-center gap-0.5"
        role="img"
        aria-label={`${rating} out of ${maxRating} stars`}
      >
        {Array.from({ length: maxRating }, (_, i) => {
          const rawDelta = rating - i
          let fillPct = 0
          if (rawDelta >= 0.75) {
            fillPct = 100
          } else if (rawDelta >= 0.25) {
            fillPct = 50
          } else {
            fillPct = 0
          }

          return (
            <div key={i} className="relative inline-block leading-none">
              <Star
                className={`${iconClass} fill-muted/30 text-muted-foreground/30`}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              {fillPct > 0 && (
                <div
                  className="absolute top-0 left-0 overflow-hidden leading-none h-full"
                  style={{ width: `${fillPct}%` }}
                >
                  <Star
                    className={`${iconClass} max-w-none flex-shrink-0 fill-amber-400 text-amber-400 stroke-amber-400`}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-label="Star Rating"
      className="inline-flex items-center gap-1"
      onMouseLeave={() => setHoverRating(null)}
    >
      {Array.from({ length: maxRating }, (_, i) => {
        const starNum = i + 1
        const isSelected = starNum <= currentRating
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === starNum}
            onClick={() => onChange(starNum)}
            onMouseEnter={() => setHoverRating(starNum)}
            className="p-0.5 rounded hover:scale-110 transition-transform cursor-pointer focus:outline-none"
          >
            <Star
              className={`${iconClass} ${isSelected
                ? 'fill-amber-400 text-amber-400 stroke-amber-400'
                : 'fill-muted/30 text-muted-foreground/30 hover:fill-amber-200'
                }`}
              strokeWidth={1.5}
            />
          </button>
        )
      })}
    </div>
  )
}
