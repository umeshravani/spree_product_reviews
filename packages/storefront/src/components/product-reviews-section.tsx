'use client';

import React, { useState, useCallback } from 'react';
import { Lock, LogIn, X } from 'lucide-react';
import type {
  ProductReview,
  ReviewImage,
  ReviewsMeta,
  CreateReviewPayload,
  UpdateReviewPayload,
} from '../types';
import type { StoreReviewsClient } from '../client';
import { useProductReviews } from '../hooks/use-product-reviews';
import { ProductReviewsSummary } from './reviews-summary';
import { ProductReviewsList } from './review-list';
import { ReviewSubmissionModal } from './review-submission-modal';
import { ReviewEditModal } from './review-edit-modal';
import { ImageLightbox } from './image-lightbox';

export interface ProductReviewsSectionProps {
  /** Spree product ID or slug */
  productId: string;
  /** Product display name (used in submission modal and headings) */
  productName?: string;
  /** Custom configured StoreReviewsClient instance */
  client?: StoreReviewsClient;
  /** Spree API host URL (e.g. 'https://api.example.com') */
  apiHost?: string;
  /** Signed-in customer's bearer token (JWT) */
  bearerToken?: string;
  /** Signed-in customer's ID for ownership checks (enabling edit/withdraw) */
  currentCustomerId?: string | null;
  /** Whether signing in is required to submit a review */
  requireLogin?: boolean;
  /** Callback fired when an unauthenticated user clicks 'Write a Review' */
  onLoginRequired?: () => void;
  /** Pre-rendered initial reviews data for Next.js SSR */
  initialData?: {
    reviews: ProductReview[];
    meta: ReviewsMeta;
  };
  /** Custom CSS classes for the root container */
  className?: string;
  /** Section heading title (default: "Customer Reviews") */
  title?: string;
  /** Whether to allow customer image attachments (default: true) */
  allowPhotos?: boolean;
  /** Maximum number of customer images allowed (default: 5) */
  maxImages?: number;
  /** Number of reviews per page */
  pageSize?: number;
}

export function ProductReviewsSection({
  productId,
  productName = 'Product',
  client,
  apiHost,
  bearerToken,
  currentCustomerId,
  requireLogin = false,
  onLoginRequired,
  initialData,
  className = '',
  title = 'Customer Reviews',
  allowPhotos = true,
  maxImages = 5,
  pageSize = 10,
}: ProductReviewsSectionProps) {
  // Use the reviews hook
  const {
    reviews,
    meta,
    isLoading,
    isLoadingMore,
    error,
    activeFilter,
    sort,
    hasMore,
    setRatingFilter,
    setSort,
    loadMore,
    submitReview,
    updateReview,
    withdrawReview,
    vote,
    report,
  } = useProductReviews({
    productId,
    client,
    apiHost,
    bearerToken,
    initialData,
    pageSize,
  });

  // Modal & Lightbox states
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ProductReview | null>(null);

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<ReviewImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Write a review button handler
  const handleWriteReviewClick = useCallback(() => {
    const isCustomerPresent = Boolean(bearerToken || currentCustomerId);
    if (requireLogin && !isCustomerPresent) {
      if (onLoginRequired) {
        onLoginRequired();
      } else {
        setIsAuthModalOpen(true);
      }
      return;
    }
    setIsSubmissionOpen(true);
  }, [requireLogin, bearerToken, currentCustomerId, onLoginRequired]);

  // Image lightbox opener
  const handleImageClick = useCallback((images: ReviewImage[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  }, []);

  // Submit review handler
  const handleSubmitReview = useCallback(
    async (payload: CreateReviewPayload) => {
      const review = await submitReview(payload);
      return { meta: { message: 'Thank you! Your review has been submitted for moderation.' }, data: review };
    },
    [submitReview]
  );

  // Edit review handler
  const handleUpdateReview = useCallback(
    async (payload: UpdateReviewPayload) => {
      if (!editingReview) return;
      await updateReview(editingReview.id, payload);
      setEditingReview(null);
    },
    [editingReview, updateReview]
  );

  // Withdraw review handler
  const handleWithdrawReview = useCallback(
    async (review: ProductReview) => {
      const confirmed = window.confirm(
        'Are you sure you want to withdraw this review? This action cannot be undone.'
      );
      if (confirmed) {
        await withdrawReview(review.id);
      }
    },
    [withdrawReview]
  );

  return (
    <section
      id="product-reviews-section"
      aria-label="Customer Reviews Section"
      className={`w-full py-8 text-neutral-900 dark:text-neutral-100 ${className}`}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Section Heading */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
            {title}
          </h2>
          {meta && meta.total_count > 0 && (
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {meta.total_count} {meta.total_count === 1 ? 'review' : 'reviews'}
            </span>
          )}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {/* Reviews Summary Component */}
        <ProductReviewsSummary
          meta={meta}
          activeFilter={activeFilter}
          onFilterSelect={setRatingFilter}
          onWriteReviewClick={handleWriteReviewClick}
        />

        {/* Reviews List Component */}
        <ProductReviewsList
          reviews={reviews}
          totalCount={meta?.total_count || 0}
          activeFilter={activeFilter}
          sort={sort}
          hasMore={hasMore}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          currentCustomerId={currentCustomerId}
          onSortChange={setSort}
          onFilterClear={() => setRatingFilter(null)}
          onLoadMore={loadMore}
          onVote={vote}
          onReport={report}
          onEditReview={(review: ProductReview) => setEditingReview(review)}
          onWithdrawReview={handleWithdrawReview}
          onImageClick={handleImageClick}
        />
      </div>

      {/* Review Submission Modal */}
      <ReviewSubmissionModal
        open={isSubmissionOpen}
        onClose={() => setIsSubmissionOpen(false)}
        onSubmit={handleSubmitReview}
        productName={productName}
        allowPhotos={allowPhotos}
        maxImages={maxImages}
      />

      {/* Review Edit Modal */}
      {editingReview && (
        <ReviewEditModal
          open={!!editingReview}
          review={editingReview}
          onClose={() => setEditingReview(null)}
          onSubmit={handleUpdateReview}
          productName={productName}
        />
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />

      {/* Sign-In Required Modal (Replaces browser alert) */}
      {isAuthModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
          onClick={() => setIsAuthModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 id="auth-modal-title" className="text-base font-semibold text-neutral-900 dark:text-white">
                  Sign In to Write a Review
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Customer feedback requires verification
                </p>
              </div>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Only verified customers can leave feedback for {productName}. Please sign in or create an account to share your thoughts and photos.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 cursor-pointer"
              >
                Cancel
              </button>
              <a
                href="/account/login"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 text-xs font-medium transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
