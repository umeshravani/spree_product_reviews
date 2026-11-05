'use client'

import { Pencil, Star } from 'lucide-react'
import type { RatingDistribution, ReviewsMeta } from '../types'

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

  const renderTierStars = (tier: number) => {
    return (
      <div className="flex items-center gap-0.5 flex-shrink-0" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i <= tier
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-amber-400'
            }`}
            strokeWidth={1.5}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={`w-full py-6 space-y-6 ${className}`}>
      {/* Top CTA Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Customer Reviews
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Verified purchaser ratings and feedback
          </p>
        </div>

        {onWriteReviewClick && (
          <button
            type="button"
            onClick={onWriteReviewClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-semibold text-xs tracking-wider uppercase transition-colors rounded-lg cursor-pointer shadow-sm"
          >
            <span>Write a Review</span>
            <Pencil className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        )}
      </div>

      {/* Production-Grade Rating Breakdown matching UI Reference (media_1793875096970_1f00cf57.png) */}
      <div className="max-w-md mx-auto sm:mx-0 py-2 space-y-3">
        {/* Prominent Center Score Header: Single Large Gold Star + 4.9 */}
        <div className="flex items-center justify-center sm:justify-start gap-2.5 pb-2">
          <Star className="w-8 h-8 fill-amber-400 text-amber-400" strokeWidth={1.5} />
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
          </span>
        </div>

        {/* 5 Rating Breakdown Rows (5 to 1 stars) */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingDistribution[star] || 0
            const pct = distributionPercentages[star] || 0
            const isSelected = currentFilter === star

            return (
              <button
                key={star}
                type="button"
                onClick={() => handleFilter?.(isSelected ? null : star)}
                className={`w-full group flex items-center gap-3.5 py-1 px-2 rounded-md transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-100 dark:bg-neutral-800 font-semibold'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                }`}
                title={`Filter by ${star} star reviews (${count})`}
              >
                {/* 5 star icons for this tier */}
                {renderTierStars(star)}

                {/* Permanent Grey Track with Dark Grey/Slate Fill */}
                <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-xs overflow-hidden relative">
                  {count > 0 && (
                    <div
                      className={`h-full bg-neutral-600 dark:bg-neutral-400 rounded-xs transition-all duration-300 ${
                        isSelected ? 'bg-black dark:bg-white' : 'group-hover:bg-neutral-800 dark:group-hover:bg-neutral-300'
                      }`}
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                      }}
                    />
                  )}
                </div>

                {/* Count in Parentheses */}
                <span className="w-14 text-right text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-normal">
                  ({count.toLocaleString()})
                </span>
              </button>
            )
          })}
        </div>

        {/* Filter status & clear filter */}
        {currentFilter !== null && (
          <div className="pt-2 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>
              Showing {currentFilter} star reviews ({ratingDistribution[currentFilter] || 0})
            </span>
            <button
              type="button"
              onClick={() => handleFilter?.(null)}
              className="text-neutral-900 dark:text-neutral-100 font-semibold underline hover:no-underline cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Convenient Aliases
export { ProductReviewsSummary as ReviewsSummary, type ProductReviewsSummaryProps as ReviewsSummaryProps }
