'use client'

import { ArrowUpDown, Filter, Loader2 } from 'lucide-react'
import type { ProductReview, ReviewImage, ReviewSortOption } from '../types'
import { ReviewCard } from './review-card'

export interface ProductReviewsListProps {
  reviews: ProductReview[]
  totalCount: number
  productId?: string
  currentCustomerReviewIds?: string[]
  currentCustomerId?: string | null
  sort: ReviewSortOption
  onSortChange: (sort: ReviewSortOption) => void
  selectedRating?: number | null
  activeFilter?: number | null
  onRatingChange?: (rating: number | null) => void
  onFilterSelect?: (rating: number | null) => void
  onFilterClear?: () => void
  onVoteHelpful?: (reviewId: string) => Promise<void>
  onVote?: (reviewId: string, helpful: boolean) => Promise<{ helpful: number; unhelpful: number }>
  onEdit?: (review: ProductReview) => void
  onEditReview?: (review: ProductReview) => void
  onWithdraw?: (reviewId: string) => void
  onWithdrawReview?: (review: ProductReview) => void
  onImageClick?: (images: ReviewImage[], clickedIndex: number) => void
  hasMore?: boolean
  onLoadMore?: () => void
  isLoading?: boolean
  isLoadingMore?: boolean
  className?: string
}

export function ProductReviewsList({
  reviews,
  totalCount,
  productId,
  currentCustomerReviewIds = [],
  currentCustomerId,
  sort,
  onSortChange,
  selectedRating = null,
  activeFilter = null,
  onRatingChange,
  onFilterSelect,
  onFilterClear,
  onVoteHelpful,
  onVote,
  onEdit,
  onEditReview,
  onWithdraw,
  onWithdrawReview,
  onImageClick,
  hasMore = false,
  onLoadMore,
  isLoading = false,
  isLoadingMore = false,
  className = '',
}: ProductReviewsListProps) {
  const currentRatingFilter = activeFilter ?? selectedRating
  const handleRatingChange = onFilterSelect ?? onRatingChange
  const handleEdit = onEditReview ?? onEdit
  const handleVote = async (reviewId: string) => {
    if (onVote) {
      await onVote(reviewId, true)
    } else if (onVoteHelpful) {
      await onVoteHelpful(reviewId)
    }
  }
  const handleWithdraw = (review: ProductReview) => {
    if (onWithdrawReview) {
      onWithdrawReview(review)
    } else if (onWithdraw) {
      onWithdraw(review.id)
    }
  }

  return (
    <section aria-label="Customer Reviews List" className={`space-y-6 ${className}`}>
      {/* List Toolbar / Sort & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {totalCount} {totalCount === 1 ? 'Review' : 'Reviews'}
          </span>
          {currentRatingFilter && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              <Filter className="w-3 h-3" />
              {currentRatingFilter} Star
              <button
                type="button"
                onClick={() => {
                  if (onFilterClear) onFilterClear()
                  else handleRatingChange?.(null)
                }}
                className="ml-1 hover:text-amber-950 dark:hover:text-amber-100 font-bold cursor-pointer"
                aria-label="Remove rating filter"
              >
                ×
              </button>
            </span>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="reviews-sort-select"
            className="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort by:
          </label>
          <select
            id="reviews-sort-select"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as ReviewSortOption)}
            className="text-xs font-medium bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 cursor-pointer"
          >
            <option value="newest">Most Recent</option>
            <option value="most_recent">Most Recent</option>
            <option value="highest_rating">Highest Rating</option>
            <option value="lowest_rating">Lowest Rating</option>
            <option value="most_helpful">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
          <p className="mt-2 text-sm">Loading reviews...</p>
        </div>
      )}

      {/* Reviews Cards */}
      {!isLoading && reviews.length > 0 ? (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {reviews.map((review) => {
            const isOwner =
              currentCustomerReviewIds.includes(review.id) ||
              (currentCustomerId && review.customer_id === currentCustomerId)

            return (
              <ReviewCard
                key={review.id}
                review={review}
                isOwner={!!isOwner}
                onVoteHelpful={() => handleVote(review.id)}
                onEdit={handleEdit ? () => handleEdit(review) : undefined}
                onWithdraw={handleWithdraw ? () => handleWithdraw(review) : undefined}
                onImageClick={(images, index) => onImageClick?.(images, index)}
              />
            )
          })}
        </div>
      ) : !isLoading ? (
        <div className="py-12 text-center text-neutral-500 dark:text-neutral-400 text-sm">
          No reviews match your current filter selection.
        </div>
      ) : null}

      {/* Pagination / Load More */}
      {hasMore && (
        <div className="pt-6 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm font-medium text-neutral-800 dark:text-neutral-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading more...</span>
              </>
            ) : (
              <span>Load More Reviews</span>
            )}
          </button>
        </div>
      )}
    </section>
  )
}

// Convenient Aliases
export { ProductReviewsList as ReviewList, type ProductReviewsListProps as ReviewListProps }
