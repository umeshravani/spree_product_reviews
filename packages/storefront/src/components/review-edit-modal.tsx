'use client'

import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import type { ProductReview, UpdateReviewPayload } from '../types'
import { StarRating } from './star-rating'

export interface ReviewEditModalProps {
  review: ProductReview | null
  open?: boolean
  isOpen?: boolean
  onClose: () => void
  onUpdate?: (reviewId: string, payload: UpdateReviewPayload) => Promise<void>
  onSubmit?: (payload: UpdateReviewPayload) => Promise<void>
  productName?: string
}

export function ReviewEditModal({
  review,
  open,
  isOpen,
  onClose,
  onUpdate,
  onSubmit,
  productName,
}: ReviewEditModalProps) {
  const isVisible = open ?? isOpen ?? false
  if (!isVisible || !review) return null

  const [rating, setRating] = useState<number>(review.rating)
  const [title, setTitle] = useState(review.title)
  const [reviewBody, setReviewBody] = useState(review.review)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !reviewBody.trim() || rating < 1) {
      setError('Please provide a rating, headline, and review text.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: UpdateReviewPayload = {
        rating,
        title: title.trim(),
        review: reviewBody.trim(),
      }

      if (onSubmit) {
        await onSubmit(payload)
      } else if (onUpdate) {
        await onUpdate(review.id, payload)
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update review'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-review-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3
          id="edit-review-modal-title"
          className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-1"
        >
          Edit Your Review
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
          {productName ? `Updating your review for ${productName}` : 'Updating your review'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Review updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Rating
            </label>
            <StarRating
              rating={rating}
              size="lg"
              interactive
              onChange={(newRating) => setRating(newRating)}
            />
          </div>

          {/* Headline */}
          <div>
            <label
              htmlFor="edit-review-title"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5"
            >
              Headline
            </label>
            <input
              id="edit-review-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Review Body */}
          <div>
            <label
              htmlFor="edit-review-body"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5"
            >
              Review
            </label>
            <textarea
              id="edit-review-body"
              rows={4}
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              required
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-y"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900 font-medium text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
