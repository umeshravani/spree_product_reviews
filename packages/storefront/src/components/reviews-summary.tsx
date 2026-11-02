'use client'

import { Pencil, Star } from 'lucide-react'
import type { RatingDistribution, ReviewsMeta } from '../types'
import { StarRating } from './star-rating'

export interface ProductReviewsSummaryProps {
  averageRating?: number
  reviewCount?: number
  ratingDistribution?: RatingDistribution
  meta?: ReviewsMeta | null
  selectedRating?: number | null
  activeFilter?: number | null
  onRatingFilterSelect?: (rating: number | null) => void
  onFilterSelect?: (rating: number | null) => void
  onWriteReviewClick?: () => void
  className?: string
}

export function ProductReviewsSummary({
  averageRating: propAverageRating,
  reviewCount: propReviewCount,
  ratingDistribution: propRatingDistribution,
  meta,
  selectedRating = null,
  activeFilter = null,
  onRatingFilterSelect,
  onFilterSelect,
  onWriteReviewClick,
  className = '',
}: ProductReviewsSummaryProps) {
  const averageRating = meta ? meta.average_rating : (propAverageRating ?? 0)
  const reviewCount = meta ? meta.review_count : (propReviewCount ?? 0)
  const ratingDistribution = meta ? meta.rating_distribution : (propRatingDistribution ?? {})
  const currentFilter = activeFilter ?? selectedRating
  const handleFilter = onFilterSelect ?? onRatingFilterSelect

  // Calculate percentage for each star level (5 to 1)
  const distributionPercentages: Record<number, number> = {}
  for (let star = 5; star >= 1; star--) {
    const count = ratingDistribution[star] || 0
    distributionPercentages[star] = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0
  }

  return (
    <div className={`w-full py-6 space-y-8 ${className}`}>
      {/* Top Bar: Title & Milano "WRITE A REVIEW" CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <span className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
            Customer Feedback
          </span>
        </div>

        {onWriteReviewClick && (
          <button
            type="button"
            onClick={onWriteReviewClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-black hover:bg-neutral-800 text-white font-semibold text-xs tracking-wider uppercase transition-colors rounded-none cursor-pointer shadow-sm border border-black"
          >
            <span>Write a Review</span>
            <Pencil className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        )}
      </div>

      {/* Main Summary: Left score & Right Milano rating breakdown bars */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left Column: Big rating score and response count */}
        <div className="md:col-span-4 flex flex-col items-start space-y-2">
          <div className="flex items-baseline gap-3">
            <span className="text-5xl sm:text-6xl font-bold tracking-tight text-neutral-900">
              {reviewCount > 0 ? averageRating.toFixed(1) : '0.0'}
            </span>
            <div className="pt-1">
              <StarRating rating={averageRating} size="md" />
            </div>
          </div>
          <p className="text-xs text-neutral-500 tracking-wide font-medium">
            {reviewCount} {reviewCount === 1 ? 'response' : 'responses'}
          </p>
        </div>

        {/* Right Column: Milano Rating Breakdown Bars */}
        <div className="md:col-span-8 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingDistribution[star] || 0
            const pct = distributionPercentages[star] || 0
            const isSelected = currentFilter === star

            return (
              <button
                key={star}
                type="button"
                onClick={() => handleFilter?.(isSelected ? null : star)}
                className={`w-full group flex items-center gap-3 text-xs py-1 px-2 rounded transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-100 font-semibold text-neutral-900'
                    : 'hover:bg-neutral-50 text-neutral-700'
                }`}
                title={`Filter by ${star} star reviews (${count})`}
              >
                <div className="flex items-center gap-1 w-12 text-left font-medium">
                  <span>{star}</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                  <span className="text-neutral-500 font-normal">{count}</span>
                </div>

                {/* Progress bar container matching Milano */}
                <div className="flex-1 h-2 bg-neutral-200 overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isSelected ? 'bg-black' : 'bg-neutral-900 group-hover:bg-black'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            )
          })}

          {currentFilter !== null && (
            <div className="pt-2 flex items-center justify-between text-xs text-neutral-500">
              <span>
                Filtered by {currentFilter} star{currentFilter > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => handleFilter?.(null)}
                className="text-neutral-900 font-medium underline hover:no-underline cursor-pointer"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Convenient Aliases
export { ProductReviewsSummary as ReviewsSummary, type ProductReviewsSummaryProps as ReviewsSummaryProps }
