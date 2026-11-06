'use client'

import { useState } from 'react'

export interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
  onChange?: (rating: number) => void
  label?: string
  color?: string
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
  color,
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
          const isFilled = index < Math.round(rating)

          return (
            <svg
              key={index}
              className={`${iconSize} shrink-0 transition-colors ${
                isFilled
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-neutral-200 text-neutral-200 dark:fill-neutral-700 dark:text-neutral-700'
              }`}
              style={isFilled && color ? { fill: color, color } : undefined}
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z" />
            </svg>
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
            className="p-1 rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 cursor-pointer"
          >
            <svg
              className={`${iconSize} transition-colors ${
                isSelected
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-neutral-200 text-neutral-200 dark:fill-neutral-700 dark:text-neutral-700'
              }`}
              style={isSelected && color ? { fill: color, color } : undefined}
              viewBox="0 0 24 24"
            >
              <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}
