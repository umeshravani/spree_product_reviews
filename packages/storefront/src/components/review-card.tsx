'use client'

import { Edit3, Flag, ShieldCheck, ThumbsUp, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ProductReview, ReviewImage } from '../types'
import { StarRating } from './star-rating'

export interface ReviewCardProps {
  review: ProductReview
  productId?: string
  isOwner?: boolean
  onVoteHelpful?: (reviewId: string) => Promise<void>
  onReport?: (reviewId: string, reason: string, details?: string) => Promise<any>
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
  onReport,
  onEdit,
  onWithdraw,
  onImageClick,
  className = '',
}: ReviewCardProps) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count)
  const [hasVoted, setHasVoted] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('spam')
  const [reportDetails, setReportDetails] = useState('')
  const [isReporting, setIsReporting] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

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

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onReport || isReporting) return
    setIsReporting(true)
    setReportError(null)

    try {
      await onReport(review.id, reportReason, reportDetails)
      setReportSuccess(true)
      setTimeout(() => {
        setShowReportModal(false)
        setReportSuccess(false)
        setReportDetails('')
      }, 2000)
    } catch (err: any) {
      setReportError(err.message || 'Failed to submit report. Please try again.')
    } finally {
      setIsReporting(false)
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
        {isOwner ? (
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
        ) : (
          onReport && (
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
              title="Report inappropriate review"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
          )
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Report Review
            </h3>
            {reportSuccess ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Thank you. This review has been submitted to moderators for review.
              </p>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3.5">
                {reportError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{reportError}</p>
                )}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Reason for report
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2 text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="spam">Spam or advertisement</option>
                    <option value="inappropriate">Offensive or inappropriate language</option>
                    <option value="harassment">Harassment or hate speech</option>
                    <option value="misleading">Misleading or false information</option>
                    <option value="other">Other issue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Additional details (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide additional context for moderators..."
                    className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isReporting}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
                  >
                    {isReporting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </article>
  )
}
