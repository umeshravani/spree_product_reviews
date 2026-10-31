'use client'

import { Edit3, ShieldCheck, ThumbsUp, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ProductReview, ReviewImage } from '../types'
import { StarRating } from './star-rating'

export interface ReviewCardProps {
  review: ProductReview
  productId?: string
  isOwner?: boolean
  onVoteHelpful?: (reviewId: string) => Promise<void>
  onEdit?: (review: ProductReview) => void
  onWithdraw?: (reviewId: string) => void
  onImageClick?: (images: ReviewImage[], clickedIndex: number) => void
  className?: string
}

export function ReviewCard({
  review,
  productId,
  isOwner = false,
  onVoteHelpful,
  onEdit,
  onWithdraw,
  onImageClick,
  className = '',
}: ReviewCardProps) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count)
  const [hasVoted, setHasVoted] = useState(false)
  const [isVoting, setIsVoting] = useState(false)

  const handleHelpfulClick = async () => {
    if (hasVoted || isVoting || !onVoteHelpful) return
    setIsVoting(true)
    // Optimistic update
    setHelpfulCount((prev) => prev + 1)
    setHasVoted(true)

    try {
      await onVoteHelpful(review.id)
    } catch {
      // Rollback on failure
      setHelpfulCount((prev) => Math.max(0, prev - 1))
      setHasVoted(false)
    } finally {
      setIsVoting(false)
    }
  }

  const formattedDate = new Date(review.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <article
      className={`border-b border-neutral-200 dark:border-neutral-800 py-6 last:border-b-0 space-y-3.5 ${className}`}
      aria-labelledby={`review-title-${review.id}`}
    >
      {/* Header: Rating, Date, Author, Verified Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-sm">
        <div className="flex items-center gap-2">
          <StarRating rating={review.rating} size="sm" />
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {review.reviewer_name || 'Verified Customer'}
          </span>
          {review.is_verified_purchase && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full"
              title="Verified Buyer of this product"
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Verified Buyer
            </span>
          )}
        </div>
        <time
          dateTime={review.created_at}
          className="text-xs text-neutral-500 dark:text-neutral-400"
        >
          {formattedDate}
        </time>
      </div>

      {/* Review Title & Body */}
      <div className="space-y-1.5">
        <h4
          id={`review-title-${review.id}`}
          className="font-medium text-base text-neutral-900 dark:text-neutral-100"
        >
          {review.title}
        </h4>
        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
          {review.review}
        </p>
      </div>

      {/* Customer Attachments Grid */}
      {review.images && review.images.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1" aria-label="Review photo attachments">
          {review.images.map((image, idx) => (
            <button
              key={image.id}
              type="button"
              onClick={() => onImageClick?.(review.images, idx)}
              className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:ring-2 hover:ring-neutral-900 dark:hover:ring-neutral-100 transition focus:outline-none cursor-pointer"
              aria-label={`View full photo ${idx + 1}`}
            >
              <img
                src={image.url}
                alt={image.filename || `Review photo ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Footer: Helpful Vote & Actions */}
      <div className="flex items-center justify-between pt-1 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-3">
          <span>Was this review helpful?</span>
          <button
            type="button"
            onClick={handleHelpfulClick}
            disabled={hasVoted || isVoting}
            aria-pressed={hasVoted}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
              hasVoted
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500'
                : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : ''}`} aria-hidden="true" />
            <span>Yes ({helpfulCount})</span>
          </button>
        </div>

        {/* Customer Self-Service Actions (Owner Only) */}
        {isOwner && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(review)}
                className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            {onWithdraw && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to withdraw this review?')) {
                    onWithdraw(review.id)
                  }
                }}
                className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 dark:text-rose-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Withdraw</span>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
