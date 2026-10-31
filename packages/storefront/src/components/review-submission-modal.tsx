'use client'

import { AlertCircle, CheckCircle2, Image as ImageIcon, Loader2, UploadCloud, X } from 'lucide-react'
import { useState } from 'react'
import type { CreateReviewPayload } from '../types'
import { StarRating } from './star-rating'

export interface ReviewSubmissionModalProps {
  open?: boolean
  isOpen?: boolean
  onClose: () => void
  productName?: string
  onSubmit: (payload: CreateReviewPayload) => Promise<unknown>
  initialName?: string
  allowImages?: boolean
  allowPhotos?: boolean
  maxImages?: number
}

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Poor — Very disappointed',
  2: 'Fair — Has some issues',
  3: 'Average — Met expectations',
  4: 'Good — Really liked it',
  5: 'Great — Exceeded expectations!',
}

export function ReviewSubmissionModal({
  open,
  isOpen,
  onClose,
  productName = 'this product',
  onSubmit,
  initialName = '',
  allowImages = true,
  allowPhotos,
  maxImages = 5,
}: ReviewSubmissionModalProps) {
  const isVisible = open ?? isOpen ?? false
  if (!isVisible) return null

  const photosAllowed = allowPhotos ?? allowImages ?? true

  const [rating, setRating] = useState<number>(5)
  const [title, setTitle] = useState('')
  const [review, setReview] = useState('')
  const [name, setName] = useState(initialName)
  const [showIdentifier, setShowIdentifier] = useState(true)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selectedFiles = Array.from(e.target.files)

    // Check count limit
    if (images.length + selectedFiles.length > maxImages) {
      setError(`You can upload a maximum of ${maxImages} images.`)
      return
    }

    // Validate size (5MB per file) and mime types
    for (const file of selectedFiles) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" exceeds the 5MB file size limit.`)
        return
      }
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" is not a valid image format.`)
        return
      }
    }

    setError(null)
    const newImages = [...images, ...selectedFiles]
    setImages(newImages)

    // Generate previews
    const newPreviews = selectedFiles.map((f) => URL.createObjectURL(f))
    setImagePreviews((prev) => [...prev, ...newPreviews])
  }

  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index)
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index)
    URL.revokeObjectURL(imagePreviews[index])
    setImages(updatedImages)
    setImagePreviews(updatedPreviews)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating < 1 || rating > 5) {
      setError('Please select a star rating from 1 to 5.')
      return
    }
    if (!title.trim()) {
      setError('Please provide a review headline.')
      return
    }
    if (!review.trim()) {
      setError('Please write a few sentences about your experience.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: CreateReviewPayload = {
        rating,
        title: title.trim(),
        review: review.trim(),
        name: name.trim() || undefined,
        show_identifier: showIdentifier,
        images: images.length > 0 ? images : undefined,
      }

      const res = await onSubmit(payload)
      let successText = 'Thank you! Your review has been submitted for moderation.'
      if (res && typeof res === 'object' && 'meta' in res) {
        const metaObj = (res as { meta?: { message?: string } }).meta
        if (metaObj && typeof metaObj.message === 'string') {
          successText = metaObj.message
        }
      }

      setSuccessMessage(successText)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit review'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-review-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 my-8"
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
          id="write-review-dialog-title"
          className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-1"
        >
          Write a Review
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
          Share your experience with <span className="font-medium text-neutral-700 dark:text-neutral-300">{productName}</span>
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">Review Received!</p>
              <p className="text-xs mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
              Overall Rating *
            </label>
            <div className="flex items-center gap-4">
              <StarRating
                rating={rating}
                size="lg"
                interactive
                onChange={(newRating) => setRating(newRating)}
              />
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {RATING_DESCRIPTIONS[rating]}
              </span>
            </div>
          </div>

          {/* Headline / Title */}
          <div>
            <label
              htmlFor="submission-title"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5"
            >
              Headline / Title *
            </label>
            <input
              id="submission-title"
              type="text"
              required
              placeholder="e.g. Great fit, superior fabric!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Review Text */}
          <div>
            <label
              htmlFor="submission-review"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5"
            >
              Written Review *
            </label>
            <textarea
              id="submission-review"
              required
              rows={4}
              placeholder="What did you like or dislike? How does it fit? Would you recommend it?"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-y"
            />
          </div>

          {/* Public Nickname */}
          <div>
            <label
              htmlFor="submission-name"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5"
            >
              Public Nickname (optional)
            </label>
            <input
              id="submission-name"
              type="text"
              placeholder="e.g. Sarah M."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Masking / Anonymous Option */}
          <div className="flex items-center gap-2">
            <input
              id="submission-show-id"
              type="checkbox"
              checked={showIdentifier}
              onChange={(e) => setShowIdentifier(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400 cursor-pointer"
            />
            <label htmlFor="submission-show-id" className="text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer">
              Display my public nickname with this review (uncheck to post as &ldquo;Verified Customer&rdquo;)
            </label>
          </div>

          {/* Photo Attachments */}
          {photosAllowed && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Customer Photos (optional, max {maxImages})
              </label>

              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {imagePreviews.map((url, index) => (
                    <div key={url} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                      <img src={url} alt="Review attachment preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        aria-label="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {images.length < maxImages && (
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl cursor-pointer bg-neutral-50 dark:bg-neutral-800/40 transition-colors">
                  <UploadCloud className="w-5 h-5 text-neutral-400 mb-1" />
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Upload photos
                  </span>
                  <span className="text-[10px] text-neutral-400">PNG, JPG, WebP up to 5MB each</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800">
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
              disabled={isSubmitting || !!successMessage}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900 font-medium text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Review</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
