'use client'

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

const StarIcon = ({ filled = true, className = "" }: { filled?: boolean; className?: string }) => (
  <svg
    className={`h-4 w-4 shrink-0 ${
      filled
        ? "fill-yellow-400 text-yellow-400"
        : "fill-neutral-200 text-neutral-200 dark:fill-neutral-700 dark:text-neutral-700"
    } ${className}`}
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z" />
  </svg>
)

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

  return (
    <div className={`w-full py-6 ${className}`}>
      {/* Header Row */}
      <div className="flex items-center gap-3">
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Customer Reviews
        </h3>
        {reviewCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} filled={i < Math.round(averageRating)} />
              ))}
            </div>
            <p className="text-sm font-medium leading-none text-gray-500 dark:text-gray-400">
              ({averageRating.toFixed(1)})
            </p>
            <span className="text-sm font-medium leading-none text-gray-900 dark:text-white">
              {reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'}
            </span>
          </div>
        )}
      </div>

      {/* Breakdown Layout matching user's reference */}
      <div className="my-6 gap-8 sm:flex sm:items-start md:my-8">
        <div className="shrink-0 space-y-4">
          <p className="text-2xl font-semibold leading-none text-gray-900 dark:text-white">
            {reviewCount > 0
              ? `${averageRating.toFixed(1)} out of 5`
              : "No reviews yet"}
          </p>

          {onWriteReviewClick && (
            <button
              type="button"
              onClick={onWriteReviewClick}
              className="mb-2 me-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-4 transition-colors bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 cursor-pointer shadow-sm"
            >
              Write a review
            </button>
          )}
        </div>

        {reviewCount > 0 && (
          <div className="mt-6 min-w-0 flex-1 space-y-3 sm:mt-0">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingDistribution[stars] || 0
              const percentage =
                reviewCount > 0 ? (count / reviewCount) * 100 : 0
              const isSelected = currentFilter === stars

              return (
                <div
                  key={stars}
                  onClick={() => handleFilter?.(isSelected ? null : stars)}
                  className={`flex items-center gap-2 py-1 px-1.5 rounded-md transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-100 dark:bg-neutral-800'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                  }`}
                  title={`Filter by ${stars} star reviews (${count})`}
                >
                  <p className="w-2 shrink-0 text-start text-sm font-medium leading-none text-gray-900 dark:text-white">
                    {stars}
                  </p>
                  <StarIcon />
                  <div className="h-1.5 w-64 sm:w-80 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-yellow-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-sm font-medium leading-none hover:underline sm:w-auto sm:text-left text-gray-900 hover:text-black dark:text-gray-300 dark:hover:text-white font-semibold">
                    {count} <span className="hidden sm:inline">reviews</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {currentFilter !== null && (
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <span>
            Showing {currentFilter} star reviews ({ratingDistribution[currentFilter] || 0})
          </span>
          <button
            type="button"
            onClick={() => handleFilter?.(null)}
            className="hover:underline font-semibold text-neutral-900 dark:text-neutral-100 cursor-pointer"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  )
}

export { ProductReviewsSummary as ReviewsSummary, type ProductReviewsSummaryProps as ReviewsSummaryProps }

