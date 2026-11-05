'use client'

import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileVideo,
  Gift,
  Image as ImageIcon,
  Loader2,
  Play,
  UploadCloud,
  Video,
  X,
} from 'lucide-react'
import React, { useRef, useState } from 'react'
import type { CreateReviewPayload, ProductReviewsSettings } from '../types'
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
  const [step, setStep] = useState<number>(1)
  const [rating, setRating] = useState<number>(5)
  const [title, setTitle] = useState('')
  const [review, setReview] = useState('')
  const [name, setName] = useState(initialName)
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
  const cameraInputRef = useRef<HTMLInputElement>(null)

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
  const step4Subtitle = settings?.step4_subtitle || 'Your feedback helps others make better choices.'

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>, preferredType?: 'image' | 'video') => {
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
      // Auto-fallback headline from review text if omitted
      setTitle(review.trim().slice(0, 60))
    }
    if (!agreedToTerms) {
      setError('Please agree to the review terms and conditions before submitting.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
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

  // Segment Progress Indicator for Multi-Step Flow (4 Segment Pills)
  const renderProgressPills = (currentStep: number) => {
    return (
      <div className="flex items-center gap-2" aria-label={`Step ${currentStep} of 4`}>
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1.5 w-10 sm:w-12 rounded-full transition-colors duration-300 ${
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
  // MULTI-STEP WIZARD VIEW (Matching media_1793875123018, media_1793875146160, etc.)
  // ----------------------------------------------------------------------------------
  if (activeMode === 'multi') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
      >
        <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-neutral-800 p-8 sm:p-10 flex flex-col justify-between min-h-[460px] transition-all">
          {/* Top Close Button (Top Left per Screenshot) */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 left-6 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* STEP 1: How would you rate this item? (media_1793875123018_cc557ae0.png) */}
          {step === 1 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-8 animate-in fade-in duration-200">
              <h2
                id="review-modal-title"
                className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 max-w-sm"
              >
                {step1Title}
              </h2>

              <div className="flex flex-col items-center space-y-3">
                {/* 5 Large Interactive Amber Stars */}
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setRating(star)
                        // Smoothly advance to Step 2
                        setTimeout(() => setStep(2), 250)
                      }}
                      className="p-1 rounded-full hover:scale-115 transition-transform duration-150 cursor-pointer focus:outline-none"
                      aria-label={`${star} star`}
                    >
                      <svg
                        className={`w-9 h-9 sm:w-11 sm:h-11 transition-colors ${
                          star <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-transparent text-amber-400'
                        }`}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                      </svg>
                    </button>
                  ))}
                </div>

                {/* Subtitles beneath the stars: "Dislike it" & "Love it!" */}
                <div className="flex items-center justify-between w-64 sm:w-72 text-xs font-medium text-neutral-800 dark:text-neutral-200 pt-1">
                  <span>{step1Dislike}</span>
                  <span>{step1Love}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Show it off (media_1793875146160_bbb176b8.png) */}
          {step === 2 && (
            <div className="flex-1 flex flex-col justify-between pt-4 pb-2 animate-in fade-in duration-200">
              <div className="text-center space-y-1.5 pb-6">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {step2Title}
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {step2Subtitle}
                </p>
              </div>

              {/* Reward Incentive Cards */}
              <div className="space-y-4 max-w-md mx-auto w-full">
                {/* Photo Upload Card */}
                <div className="border border-neutral-300 dark:border-neutral-700 rounded-2xl p-6 text-center space-y-4 shadow-2xs hover:border-neutral-400 transition-colors">
                  <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                    {photoRewardText}
                  </h3>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-bold text-sm tracking-wide transition-all cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Add photos</span>
                  </button>
                </div>

                {/* Video Upload Card */}
                <div className="border border-neutral-300 dark:border-neutral-700 rounded-2xl p-6 text-center space-y-4 shadow-2xs hover:border-neutral-400 transition-colors">
                  <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                    {videoRewardText}
                  </h3>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-bold text-sm tracking-wide transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Add video</span>
                  </button>
                </div>

                {/* Media Preview Thumbnails */}
                {mediaPreviews.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-2.5 justify-center">
                    {mediaPreviews.map((preview, idx) => (
                      <div
                        key={idx}
                        className="relative group w-16 h-16 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
                      >
                        {preview.isVideo ? (
                          <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-white">
                            <Video className="w-6 h-6" />
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
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                          title="Remove media"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden File Inputs */}
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

              {/* Bottom Nav Bar matching Screenshot */}
              <div className="pt-8 flex items-center justify-between w-full border-t border-neutral-100 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-neutral-100 hover:opacity-70 transition-opacity cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                {renderProgressPills(2)}

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-sm font-bold text-neutral-900 dark:text-neutral-100 hover:opacity-70 transition-opacity cursor-pointer"
                >
                  {mediaFiles.length > 0 ? 'Next' : 'Skip'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Tell us more! (media_1793875161750_593f9982.png) */}
          {step === 3 && (
            <div className="flex-1 flex flex-col justify-between pt-4 pb-2 animate-in fade-in duration-200">
              <div className="text-center pb-4">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {step3Title}
                </h2>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 border border-red-200 dark:border-red-900/40">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* If authentication is required and user is not logged in */}
              {!isAuthenticated && !settings?.allow_anonymous ? (
                <div className="my-auto text-center p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-3">
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    Sign in to post your review
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                    To maintain trustworthy feedback from verified shoppers, please sign in to your account.
                  </p>
                  <a
                    href={loginUrl}
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-black hover:bg-neutral-800 text-white font-semibold text-xs tracking-wider uppercase rounded-xl transition-colors cursor-pointer"
                  >
                    Sign In
                  </a>
                </div>
              ) : (
                <div className="space-y-4 max-w-md mx-auto w-full">
                  {/* Headline / Title (Sentence Case) */}
                  <div>
                    <input
                      type="text"
                      placeholder="Headline (e.g. Amazing quality and fast delivery)"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  {/* Main Review Textarea matching Screenshot */}
                  <div className="relative">
                    <textarea
                      rows={5}
                      placeholder={step3Placeholder}
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      className="w-full p-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all resize-none text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  {/* Nickname & Display Preference */}
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      placeholder="Your name or nickname (optional)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-neutral-100"
                    />

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        id="multi-show-name"
                        type="checkbox"
                        checked={showIdentifier}
                        onChange={(e) => setShowIdentifier(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
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
              <div className="pt-6 flex items-center justify-between w-full border-t border-neutral-100 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-neutral-100 hover:opacity-70 transition-opacity cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                {renderProgressPills(3)}

                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting || !review.trim()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-bold text-sm tracking-wide transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Next</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Thank you for posting! (Confirmation & Reward Banner) */}
          {step === 4 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 stroke-[2.2]" />
              </div>

              <div className="space-y-2 max-w-sm">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {step4Title}
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {step4Subtitle}
                </p>
              </div>

              {/* Reward Notification Banner */}
              {mediaFiles.length > 0 && (
                <div className="max-w-md w-full p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-left flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Reward Issued on Approval
                    </h4>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      You&apos;ve uploaded media with your review! As soon as your review is approved by our team, your Gift Card will automatically appear in your account for checkout.
                    </p>
                    {rewardCode && (
                      <div className="pt-1.5 flex items-center gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground">Reward code:</span>
                        <code className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-xs font-bold text-amber-900 dark:text-amber-100">
                          {rewardCode}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 w-full max-w-xs">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 px-6 rounded-xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-bold text-sm tracking-wide transition-all cursor-pointer shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ----------------------------------------------------------------------------------
  // SINGLE-PAGE CLEAN SUBMISSION FORM (Clean UI/UX, no all-caps, with inline login)
  // ----------------------------------------------------------------------------------
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-neutral-800 p-6 sm:p-8">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Write a review
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Share your feedback for {productName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 border border-red-200 dark:border-red-900/40">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* If Guest Reviews Disabled and User Not Authenticated: Prompt Login */}
        {!isAuthenticated && !settings?.allow_anonymous ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Authentication required
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                Please log in to your store account to submit a review for this item.
              </p>
            </div>
            <a
              href={loginUrl}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-black hover:bg-neutral-800 text-white font-semibold text-xs tracking-wider uppercase rounded-xl transition-colors cursor-pointer"
            >
              Sign In
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Overall Rating (Sentence Case) */}
            <div className="space-y-2">
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

            {/* Review Headline (Sentence Case) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Review headline
              </label>
              <input
                type="text"
                placeholder="e.g. Outstanding quality, exceeded expectations"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-neutral-100"
              />
            </div>

            {/* Detailed Review (Sentence Case) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Detailed review <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="What did you like or dislike? How does it fit or feel?"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                required
                className="w-full p-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all resize-none text-neutral-900 dark:text-neutral-100"
              />
            </div>

            {/* Public Nickname (Sentence Case) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Public nickname (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-neutral-100"
              />
            </div>

            {/* Photos & Videos Upload */}
            {photosAllowed && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Customer photos &amp; videos (optional, max {maxImages})
                  </label>
                  {settings?.rewards_enabled && (
                    <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                      🎁 Earn Gift Card discount
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-neutral-500" />
                    <span>Upload photos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    <Video className="w-4 h-4 text-neutral-500" />
                    <span>Upload video</span>
                  </button>
                </div>

                {/* Previews */}
                {mediaPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {mediaPreviews.map((preview, idx) => (
                      <div
                        key={idx}
                        className="relative w-14 h-14 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
                      >
                        {preview.isVideo ? (
                          <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-white">
                            <Video className="w-5 h-5" />
                          </div>
                        ) : (
                          <img
                            src={preview.url}
                            alt="Attachment preview"
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(idx)}
                          className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
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
            )}

            {/* Checkboxes: Terms & Show Identifier */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2.5">
                <input
                  id="single-show-id"
                  type="checkbox"
                  checked={showIdentifier}
                  onChange={(e) => setShowIdentifier(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                />
                <label
                  htmlFor="single-show-id"
                  className="text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none"
                >
                  Display my public nickname with this review (uncheck to post as &ldquo;Verified Customer&rdquo;)
                </label>
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  id="single-terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                />
                <label
                  htmlFor="single-terms"
                  className="text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none"
                >
                  By publishing this review you agree with our terms and guidelines.
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !review.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-sm disabled:opacity-40 cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Submit review</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
