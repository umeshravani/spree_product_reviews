'use client'

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Gift,
  Image as ImageIcon,
  Loader2,
  Play,
  Video,
  X,
} from 'lucide-react'
import React, { useRef, useState } from 'react'
import type { CreateReviewPayload, ProductReview, ProductReviewsSettings, UpdateReviewPayload } from '../types'
import { StarRating } from './star-rating'

export interface ReviewSubmissionModalProps {
  open?: boolean
  isOpen?: boolean
  onClose: () => void
  productName?: string
  onSubmit: (payload: CreateReviewPayload) => Promise<unknown>
  onUpdateReview?: (id: string, payload: UpdateReviewPayload) => Promise<unknown>
  existingReview?: ProductReview | null
  initialName?: string
  allowImages?: boolean
  allowPhotos?: boolean
  maxImages?: number
  settings?: ProductReviewsSettings
  mode?: 'single' | 'multi'
  isAuthenticated?: boolean
  loginUrl?: string
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
  onUpdateReview,
  existingReview,
  initialName = '',
  allowImages = true,
  allowPhotos,
  maxImages = 5,
  settings,
  mode,
  isAuthenticated = true,
  loginUrl = '/login',
}: ReviewSubmissionModalProps) {
  const isVisible = open ?? isOpen ?? false
  if (!isVisible) return null

  // Determine modal mode: props > settings > default 'multi'
  const activeMode: 'single' | 'multi' = mode || settings?.modal_mode || 'multi'
  const photosAllowed = allowPhotos ?? allowImages ?? true

  // Form State
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false)
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState<boolean>(Boolean(existingReview))
  const [step, setStep] = useState<number>(1)
  const [rating, setRating] = useState<number>(existingReview?.rating || 5)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [title, setTitle] = useState(existingReview?.title || '')
  const [review, setReview] = useState(existingReview?.review || '')
  const [name, setName] = useState(existingReview?.reviewer_name || initialName)
  const [showIdentifier, setShowIdentifier] = useState(true)
  const [agreedToTerms, setAgreedToTerms] = useState(true)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<
    { url: string; isVideo: boolean; name: string }[]
  >([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rewardCode, setRewardCode] = useState<string | null>(null)

  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Settings customizable labels
  const step1Title = settings?.step1_title || 'How would you rate this item?'
  const step1Dislike = settings?.step1_dislike_label || 'Dislike it'
  const step1Love = settings?.step1_love_label || 'Love it!'
  const step2Title = settings?.step2_title || 'Show it off'
  const step2Subtitle = settings?.step2_subtitle || "We'd love to see it in action!"
  const photoRewardText = settings?.photo_reward_text || 'Get 15% off your next purchase'
  const videoRewardText = settings?.video_reward_text || 'Get 20% off your next purchase'
  const step3Title = settings?.step3_title || 'Tell us more!'
  const step3Placeholder = settings?.step3_placeholder || 'Share your experience'
  const step4Title = settings?.step4_title || 'Thank you for posting!'
  const requireApproval = settings?.require_approval ?? true

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>, preferredType?: 'image' | 'video') => {
    if (!e.target.files) return
    const selectedFiles = Array.from(e.target.files)

    if (mediaFiles.length + selectedFiles.length > maxImages) {
      setError(`You can upload a maximum of ${maxImages} media files.`)
      return
    }

    for (const file of selectedFiles) {
      const isVideo = file.type.startsWith('video/')
      const isImage = file.type.startsWith('image/')

      if (!isVideo && !isImage) {
        setError(`"${file.name}" is not a supported image or video format.`)
        return
      }

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

    const newPreviews = selectedFiles.map((f) => ({
      url: URL.createObjectURL(f),
      isVideo: f.type.startsWith('video/'),
      name: f.name,
    }))
    setMediaPreviews((prev) => [...prev, ...newPreviews])
    e.target.value = ''
  }

  const handleRemoveMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index].url)
    const updatedFiles = mediaFiles.filter((_, i) => i !== index)
    const updatedPreviews = mediaPreviews.filter((_, i) => i !== index)
    setMediaFiles(updatedFiles)
    setMediaPreviews(updatedPreviews)
  }

  const handleStartEditExisting = () => {
    if (existingReview) {
      setRating(existingReview.rating || 5)
      setTitle(existingReview.title || '')
      setReview(existingReview.review || '')
      setName(existingReview.reviewer_name || '')
      setIsEditingExisting(true)
    }
    setShowDuplicatePrompt(false)
  }

  const handleStartNewReview = () => {
    setIsEditingExisting(false)
    setShowDuplicatePrompt(false)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (rating < 1 || rating > 5) {
      setError('Please select a star rating from 1 to 5.')
      return
    }
    if (!review.trim()) {
      setError('Please write a few sentences about your experience.')
      return
    }
    if (!title.trim()) {
      setTitle(review.trim().slice(0, 60))
    }
    if (!agreedToTerms) {
      setError('Please agree to the review terms and conditions before submitting.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (isEditingExisting && existingReview?.id && onUpdateReview) {
        // Update existing review (resets to pending moderation for admin approval)
        const updatePayload: UpdateReviewPayload = {
          rating,
          title: title.trim() || review.trim().slice(0, 60),
          review: review.trim(),
        }
        await onUpdateReview(existingReview.id, updatePayload)
      } else {
        const payload: CreateReviewPayload = {
          rating,
          title: title.trim() || review.trim().slice(0, 60),
          review: review.trim(),
          name: name.trim() || undefined,
          show_identifier: showIdentifier,
          images: mediaFiles.length > 0 ? mediaFiles : undefined,
        }

        const res = await onSubmit(payload)
        if (res && typeof res === 'object') {
          const resObj = res as { data?: { reward_code?: string }; reward_code?: string }
          const code = resObj.data?.reward_code || resObj.reward_code
          if (code) setRewardCode(code)
        }
      }

      if (activeMode === 'multi') {
        setStep(4) // Advance to confirmation step
      } else {
        setTimeout(() => onClose(), 1500)
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit review'
      setError(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderProgressPills = (currentStep: number) => {
    return (
      <div className="flex items-center gap-2" aria-label={`Step ${currentStep} of 4`}>
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1.5 w-8 sm:w-10 rounded-full transition-colors duration-300 ${
              s <= currentStep
                ? 'bg-black dark:bg-white'
                : 'bg-neutral-200 dark:bg-neutral-700'
            }`}
          />
        ))}
      </div>
    )
  }

  // ----------------------------------------------------------------------------------
  // MULTI-STEP WIZARD VIEW
  // ----------------------------------------------------------------------------------
  if (activeMode === 'multi') {
    return (
      <>
        {/* Backdrop matching Region and Language selector */}
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100"
          onClick={onClose}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-background p-6 text-sm ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-lg bg-white dark:bg-neutral-900 shadow-2xl transition-all"
        >
          {/* Close Button matching clean Radix/Shadcn dialog */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-xs p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 focus:outline-hidden transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* DUPLICATE / EXISTING REVIEW PROMPT */}
          {showDuplicatePrompt ? (
            <div className="flex flex-col items-center justify-center text-center py-6 space-y-5 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 stroke-[2]" />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Already Reviewed
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  You have already reviewed <strong>{productName}</strong>. Would you like to update your existing review or submit a new one?
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs pt-2">
                <button
                  type="button"
                  onClick={handleStartEditExisting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black font-semibold text-xs tracking-wide transition-colors cursor-pointer"
                >
                  Update Review
                </button>
                <button
                  type="button"
                  onClick={handleStartNewReview}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold text-xs tracking-wide hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  Submit New
                </button>
              </div>
            </div>
          ) : null}

          {/* STEP 1: How would you rate this item? */}
          {!showDuplicatePrompt && step === 1 && (
            <div className="flex flex-col items-center justify-center text-center py-6 space-y-8 animate-in fade-in duration-200">
              <h2
                id="review-modal-title"
                className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 max-w-sm"
              >
                {step1Title}
              </h2>

              <div
                className="flex flex-col items-center space-y-3"
                onMouseLeave={() => setHoveredRating(null)}
              >
                {/* 5 Large Interactive Amber Stars with Hover & Click Fill */}
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeRating = hoveredRating !== null ? hoveredRating : rating
                    const isFilled = star <= activeRating

                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoveredRating(star)}
                        onClick={() => {
                          setRating(star)
                          setTimeout(() => setStep(2), 220)
                        }}
                        className="p-1 rounded-full hover:scale-110 transition-transform duration-150 cursor-pointer focus:outline-none"
                        aria-label={`${star} star`}
                      >
                        <svg
                          className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                            isFilled
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'fill-neutral-200 text-neutral-200 dark:fill-neutral-700 dark:text-neutral-700'
                          }`}
                          viewBox="0 0 24 24"
                        >
                          <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z" />
                        </svg>
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between w-64 text-xs font-medium text-neutral-700 dark:text-neutral-300 pt-1">
                  <span>{step1Dislike}</span>
                  <span>{step1Love}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Show it off (Photo & Video Upload) */}
          {!showDuplicatePrompt && step === 2 && (
            <div className="flex flex-col justify-between pt-2 pb-1 animate-in fade-in duration-200">
              <div className="text-center space-y-1 pb-5">
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {step2Title}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {step2Subtitle}
                </p>
              </div>

              {/* Upload Incentive Cards */}
              <div className="space-y-3.5 max-w-md mx-auto w-full">
                {/* Photo Upload Card */}
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 text-center space-y-3 shadow-2xs">
                  <h3 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                    {photoRewardText}
                  </h3>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-semibold text-xs tracking-wide transition-all cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Add photos</span>
                  </button>
                </div>

                {/* Video Upload Card */}
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 text-center space-y-3 shadow-2xs">
                  <h3 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                    {videoRewardText}
                  </h3>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-semibold text-xs tracking-wide transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Add video</span>
                  </button>
                </div>

                {/* Media Preview Thumbnails with Video support */}
                {mediaPreviews.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-2 justify-center">
                    {mediaPreviews.map((preview, idx) => (
                      <div
                        key={idx}
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-900"
                      >
                        {preview.isVideo ? (
                          <div className="w-full h-full relative flex flex-col items-center justify-center p-1">
                            <video
                              src={preview.url}
                              className="absolute inset-0 w-full h-full object-cover opacity-60"
                              muted
                              playsInline
                              preload="metadata"
                            />
                            <div className="relative z-10 flex flex-col items-center">
                              <Video className="w-5 h-5 text-white drop-shadow" />
                              <span className="text-[8px] font-mono mt-0.5 max-w-[50px] truncate text-center text-white drop-shadow">
                                {preview.name}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={preview.url}
                            alt="Uploaded attachment"
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer z-20"
                          title="Remove media"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={photoInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleMediaChange(e, 'image')}
                  className="hidden"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={(e) => handleMediaChange(e, 'video')}
                  className="hidden"
                />
              </div>

              {/* Bottom Nav Bar */}
              <div className="pt-6 flex items-center justify-between w-full border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100 hover:opacity-70 transition-opacity cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                {renderProgressPills(2)}

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 hover:opacity-70 transition-opacity cursor-pointer"
                >
                  {mediaFiles.length > 0 ? 'Next' : 'Skip'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Tell us more! */}
          {!showDuplicatePrompt && step === 3 && (
            <div className="flex flex-col justify-between pt-2 pb-1 animate-in fade-in duration-200">
              <div className="text-center pb-3">
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {step3Title}
                </h2>
              </div>

              {error && (
                <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 border border-red-200 dark:border-red-900/40">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!isAuthenticated && !settings?.allow_anonymous ? (
                <div className="my-auto text-center p-6 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-3">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Sign in to post your review
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                    To maintain trustworthy feedback from verified shoppers, please sign in to your account.
                  </p>
                  <a
                    href={loginUrl}
                    className="inline-flex items-center justify-center px-5 py-2 bg-black hover:bg-neutral-800 text-white font-semibold text-xs tracking-wider uppercase rounded-lg transition-colors cursor-pointer"
                  >
                    Sign In
                  </a>
                </div>
              ) : (
                <div className="space-y-3.5 max-w-md mx-auto w-full">
                  {/* Headline */}
                  <div>
                    <input
                      type="text"
                      placeholder="Headline (e.g. Amazing quality and fast delivery)"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm outline-none transition-colors focus:border-black focus:[outline:1px_solid_black] dark:focus:border-white dark:focus:[outline:1px_solid_white] text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  {/* Main Review Textarea */}
                  <div>
                    <textarea
                      rows={4}
                      placeholder={step3Placeholder}
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      className="w-full p-3.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm outline-none transition-colors focus:border-black focus:[outline:1px_solid_black] dark:focus:border-white dark:focus:[outline:1px_solid_white] resize-none text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  {/* Nickname & Checkbox with extra bottom padding */}
                  <div className="space-y-2 pt-1 mb-6">
                    <input
                      type="text"
                      placeholder="Your name or nickname (optional)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs outline-none transition-colors focus:border-black focus:[outline:1px_solid_black] dark:focus:border-white dark:focus:[outline:1px_solid_white] text-neutral-900 dark:text-neutral-100"
                    />

                    <div className="flex items-center gap-2 pt-2 pb-2">
                      <input
                        id="multi-show-name"
                        type="checkbox"
                        checked={showIdentifier}
                        onChange={(e) => setShowIdentifier(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                      />
                      <label
                        htmlFor="multi-show-name"
                        className="text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none"
                      >
                        Display my name with this review (uncheck to post as &ldquo;Verified Customer&rdquo;)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Nav Bar */}
              <div className="pt-4 flex items-center justify-between w-full border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100 hover:opacity-70 transition-opacity cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                {renderProgressPills(3)}

                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting || !review.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-black hover:bg-neutral-800 text-white font-semibold text-xs tracking-wide transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isEditingExisting ? 'Update Review' : 'Next'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Thank you for posting! */}
          {!showDuplicatePrompt && step === 4 && (
            <div className="flex flex-col items-center justify-center text-center py-6 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
              </div>

              <div className="space-y-2 max-w-sm">
                <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {step4Title}
                </h2>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {requireApproval
                    ? 'Your review has been submitted and is awaiting staff approval before going live.'
                    : 'Your review has been published and is now live on the store.'}
                </p>
              </div>

              {/* Reward Notification Banner */}
              {rewardCode && (
                <div className="max-w-md w-full p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-left flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Reward Unlocked!
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Your Gift Card code: <code className="font-mono font-bold bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">{rewardCode}</code>
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-6 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs tracking-wide transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </>
    )
  }

  // ----------------------------------------------------------------------------------
  // SINGLE-PAGE FORM VIEW
  // ----------------------------------------------------------------------------------
  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-white dark:bg-neutral-900 p-6 text-sm ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-lg shadow-2xl transition-all max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Write a review
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Share your feedback for {productName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 border border-red-200 dark:border-red-900/40">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isAuthenticated && !settings?.allow_anonymous ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-xs text-neutral-500">
              Please sign in to submit a review for this product.
            </p>
            <a
              href={loginUrl}
              className="inline-flex items-center justify-center px-5 py-2 bg-black hover:bg-neutral-800 text-white font-semibold text-xs tracking-wider uppercase rounded-lg transition-colors"
            >
              Sign In
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Overall rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <StarRating
                  rating={rating}
                  size="lg"
                  interactive={true}
                  onChange={(r) => setRating(r)}
                />
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {RATING_DESCRIPTIONS[rating]}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Headline
              </label>
              <input
                type="text"
                placeholder="e.g. Outstanding quality, highly recommend"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm outline-none transition-colors focus:border-black focus:[outline:1px_solid_black] dark:focus:border-white dark:focus:[outline:1px_solid_white]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Detailed review <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Share your experience..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                required
                className="w-full p-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm outline-none transition-colors focus:border-black focus:[outline:1px_solid_black] dark:focus:border-white dark:focus:[outline:1px_solid_white] resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Public nickname (optional)
              </label>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs outline-none transition-colors focus:border-black focus:[outline:1px_solid_black] dark:focus:border-white dark:focus:[outline:1px_solid_white]"
              />
            </div>

            {/* Checkbox with padding */}
            <div className="pt-2 mb-4">
              <div className="flex items-center gap-2">
                <input
                  id="single-show-id"
                  type="checkbox"
                  checked={showIdentifier}
                  onChange={(e) => setShowIdentifier(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                />
                <label
                  htmlFor="single-show-id"
                  className="text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none"
                >
                  Display my public nickname with this review
                </label>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !review.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition-all shadow-xs disabled:opacity-40"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Submit review</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
