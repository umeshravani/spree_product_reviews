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
        <div className="shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-8 h-8 fill-yellow-400 text-yellow-400 shrink-0" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              {reviewCount > 0 ? averageRating.toFixed(1) : "0.0"}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {reviewCount > 0
              ? `${reviewCount} ${reviewCount === 1 ? 'verified review' : 'verified reviews'}`
              : "No reviews yet"}
          </p>

          {onWriteReviewClick && (
            <button
              type="button"
              onClick={onWriteReviewClick}
              className="mt-2 inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-semibold text-white bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-colors shadow-xs cursor-pointer"
            >
              Write a review
            </button>
          )}
        </div>

        {reviewCount > 0 && (
          <div className="mt-6 min-w-0 flex-1 space-y-2.5 sm:mt-0">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingDistribution[stars] || 0
              const percentage =
                reviewCount > 0 ? (count / reviewCount) * 100 : 0
              const isSelected = currentFilter === stars

              return (
                <div
                  key={stars}
                  onClick={() => handleFilter?.(isSelected ? null : stars)}
                  className={`flex items-center gap-3 py-1 px-2 rounded-md transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-100 dark:bg-neutral-800'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                  }`}
                  title={`Filter by ${stars} star reviews (${count})`}
                >
                  <div className="flex items-center gap-0.5 shrink-0">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} filled={i < stars} />
                    ))}
                  </div>
                  <div className="h-2 w-48 sm:w-64 md:w-80 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-yellow-400 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-normal text-neutral-500 dark:text-neutral-400 shrink-0 min-w-[2.5rem]">
                    ({count.toLocaleString()})
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

