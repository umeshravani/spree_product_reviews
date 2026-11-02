'use client'

import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  UploadCloud,
  Video,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
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
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<
    { url: string; isVideo: boolean; name: string }[]
  >([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selectedFiles = Array.from(e.target.files)

    // Check count limit
    if (mediaFiles.length + selectedFiles.length > maxImages) {
      setError(`You can upload a maximum of ${maxImages} media files.`)
      return
    }

    // Validate size and format
    for (const file of selectedFiles) {
      const isVideo = file.type.startsWith('video/')
      const isImage = file.type.startsWith('image/')

      if (!isVideo && !isImage) {
        setError(`"${file.name}" is not a supported image or video format.`)
        return
      }

      // Max 50MB for video, 10MB for image
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) {
        setError(
          `"${file.name}" exceeds the ${isVideo ? '50MB' : '10MB'} size limit.`
        )
        return
      }
    }

    setError(null)
    const newFiles = [...mediaFiles, ...selectedFiles]
    setMediaFiles(newFiles)

    // Generate previews
    const newPreviews = selectedFiles.map((f) => ({
      url: URL.createObjectURL(f),
      isVideo: f.type.startsWith('video/'),
      name: f.name,
    }))
    setMediaPreviews((prev) => [...prev, ...newPreviews])

    // Reset input
    e.target.value = ''
  }

  const handleRemoveMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index].url)
    const updatedFiles = mediaFiles.filter((_, i) => i !== index)
    const updatedPreviews = mediaPreviews.filter((_, i) => i !== index)
    setMediaFiles(updatedFiles)
    setMediaPreviews(updatedPreviews)
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
        images: mediaFiles.length > 0 ? mediaFiles : undefined,
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
        className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 space-y-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div>
            <h3
              id="write-review-dialog-title"
              className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight"
            >
              Write a Review
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Share your honest feedback for{' '}
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                {productName}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center gap-3 text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs sm:text-sm font-medium">{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center gap-2.5 text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium">{error}</span>
          </div>
        )}

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Rating */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
              Overall Rating *
            </label>
            <div className="flex items-center gap-4">
              <StarRating
                rating={rating}
                interactive
                size="lg"
                onChange={(newRating) => setRating(newRating)}
              />
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                {RATING_DESCRIPTIONS[rating] || ''}
              </span>
            </div>
          </div>

          {/* Headline / Title */}
          <div>
            <label
              htmlFor="submission-title"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5"
            >
              Review Headline *
            </label>
            <input
              id="submission-title"
              type="text"
              required
              placeholder="e.g. Absolutely fantastic quality & fit!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Review Body */}
          <div>
            <label
              htmlFor="submission-review"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5"
            >
              Detailed Review *
            </label>
            <textarea
              id="submission-review"
              required
              rows={4}
              placeholder="What did you like or dislike? How does it look and perform in person?"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-y"
            />
          </div>

          {/* Nickname */}
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
            <label
              htmlFor="submission-show-id"
              className="text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer"
            >
              Display my public nickname with this review (uncheck to post as &ldquo;Verified Customer&rdquo;)
            </label>
          </div>

          {/* Media / Photo / Video Attachments */}
          {photosAllowed && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Customer Photos & Videos (optional, max {maxImages})
              </label>

              {mediaPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2.5 mb-3">
                  {mediaPreviews.map((item, index) => (
                    <div
                      key={item.url}
                      className="relative group w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
                    >
                      {item.isVideo ? (
                        <div className="w-full h-full relative">
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            loop
                            autoPlay
                          />
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white rounded p-0.5">
                            <Video className="w-3 h-3" />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt="Review attachment preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(index)}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        aria-label="Remove media"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {mediaFiles.length < maxImages && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Gallery / Files upload */}
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-3 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 text-neutral-700 dark:text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-neutral-500" />
                    <span>Upload Photos / Videos</span>
                  </button>

                  {/* Option 2: Direct Camera / Capture */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-3 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 text-neutral-700 dark:text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-neutral-500" />
                    <span>Take Photo / Video</span>
                  </button>

                  {/* Hidden inputs */}
                  <input
                    ref={galleryInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleMediaChange}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*,video/*"
                    capture="environment"
                    onChange={handleMediaChange}
                    className="hidden"
                  />
                </div>
              )}
              <p className="text-[10px] text-neutral-400 mt-1">
                Supports JPG, PNG, WebP, MP4, MOV up to 50MB
              </p>
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
