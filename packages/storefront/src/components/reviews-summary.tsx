'use client'

import { MessageSquarePlus } from 'lucide-react'
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
    <div
      className={`rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 md:p-8 shadow-sm ${className}`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <span className="text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
              {reviewCount > 0 ? averageRating.toFixed(1) : '0.0'}
            </span>
            <div className="mt-1">
              <StarRating rating={averageRating} size="md" />
            </div>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Based on {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          <div className="hidden sm:block h-16 w-px bg-neutral-200 dark:bg-neutral-800" />

          {/* Value proposition / prompt */}
          <div className="hidden sm:block">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">
              Customer Feedback
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-xs">
              All reviews are from verified purchasers and subject to store moderation.
            </p>
          </div>
        </div>

        {/* Write a review CTA */}
        {onWriteReviewClick && (
          <button
            type="button"
            onClick={onWriteReviewClick}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900 font-medium text-sm transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Write a Review</span>
          </button>
        )}
      </div>

      {/* Rating Breakdown Bars */}
      {reviewCount > 0 ? (
        <div className="mt-6 space-y-2.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingDistribution[star] || 0
            const pct = distributionPercentages[star] || 0
            const isSelected = currentFilter === star

            return (
              <button
                key={star}
                type="button"
                onClick={() => handleFilter?.(isSelected ? null : star)}
                className={`w-full group flex items-center gap-3 text-xs rounded-lg py-1 px-2 -mx-2 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-neutral-50'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400'
                }`}
                title={`Filter by ${star} star reviews (${count})`}
              >
                <span className="w-12 text-left font-medium">{star} stars</span>

                <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isSelected
                        ? 'bg-amber-500'
                        : 'bg-amber-400 group-hover:bg-amber-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="w-16 text-right tabular-nums">
                  <span className="font-medium">{pct}%</span>
                  <span className="text-neutral-400 ml-1">({count})</span>
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
                className="text-neutral-900 dark:text-neutral-100 font-medium underline hover:no-underline cursor-pointer"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-neutral-500 dark:text-neutral-400 text-sm">
          No customer reviews yet. Be the first to share your thoughts on this product!
        </div>
      )}
    </div>
  )
}

// Convenient Aliases
export { ProductReviewsSummary as ReviewsSummary, type ProductReviewsSummaryProps as ReviewsSummaryProps }
