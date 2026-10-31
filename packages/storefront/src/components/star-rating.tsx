'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'

export interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
  onChange?: (rating: number) => void
  label?: string
  className?: string
}

const sizeMap = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-7 h-7',
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onChange,
  label,
  className = '',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const currentRating = hoverRating !== null ? hoverRating : rating
  const iconSize = sizeMap[size] || sizeMap.md

  if (!interactive) {
    return (
      <div
        className={`flex items-center gap-0.5 ${className}`}
        aria-label={`${rating} out of ${maxRating} stars`}
      >
        {Array.from({ length: maxRating }, (_, index) => {
          const starNumber = index + 1
          const fillAmount = Math.max(0, Math.min(1, rating - index))

          return (
            <div key={index} className="relative inline-block leading-none">
              <Star
                className={`${iconSize} text-neutral-300 dark:text-neutral-700`}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              {fillAmount > 0 && (
                <div
                  className="absolute top-0 left-0 overflow-hidden leading-none text-amber-400 dark:text-amber-500"
                  style={{ width: `${fillAmount * 100}%` }}
                >
                  <Star
                    className={`${iconSize} fill-amber-400 text-amber-400 dark:fill-amber-500 dark:text-amber-500`}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
          )
        })}
        {label && <span className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">{label}</span>}
      </div>
    )
  }

  // Interactive picker
  return (
    <div
      role="radiogroup"
      aria-label={label || 'Rating'}
      className={`flex items-center gap-1.5 focus:outline-none ${className}`}
      onMouseLeave={() => setHoverRating(null)}
    >
      {Array.from({ length: maxRating }, (_, index) => {
        const starNumber = index + 1
        const isSelected = starNumber <= currentRating

        return (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={rating === starNumber}
            aria-label={`${starNumber} star${starNumber > 1 ? 's' : ''}`}
            tabIndex={0}
            onClick={() => onChange?.(starNumber)}
            onMouseEnter={() => setHoverRating(starNumber)}
            onFocus={() => setHoverRating(starNumber)}
            onBlur={() => setHoverRating(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' && starNumber < maxRating) {
                onChange?.(starNumber + 1)
              } else if (e.key === 'ArrowLeft' && starNumber > 1) {
                onChange?.(starNumber - 1)
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onChange?.(starNumber)
              }
            }}
            className="p-1 rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
          >
            <Star
              className={`${iconSize} transition-colors ${
                isSelected
                  ? 'fill-amber-400 text-amber-400 dark:fill-amber-500 dark:text-amber-500'
                  : 'text-neutral-300 dark:text-neutral-600 hover:text-amber-300'
              }`}
              strokeWidth={1.75}
            />
          </button>
        )
      })}
    </div>
  )
}
