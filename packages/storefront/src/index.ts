// Main barrel export for @umeshravani/spree-product-reviews-storefront

// Types
export type {
  ProductReview,
  ReviewImage,
  ReviewsMeta,
  RatingDistribution,
  ReviewSortOption,
  CreateReviewPayload,
  UpdateReviewPayload,
  ReviewsClientConfig,
  ListReviewsParams,
  ReviewsResponse,
  ReviewListQuery,
  ReviewListResponse,
  ReportReason,
  ReportReviewPayload,
} from './types';

// API Client
export { StoreReviewsClient, createReviewsClient } from './client';

// SEO & Structured Data
export {
  generateProductReviewsJsonLd,
  type ProductMetadata,
  type ReviewsJsonLdOptions,
} from './seo';

// Hooks
export {
  useProductReviews,
  type UseProductReviewsOptions,
  type UseProductReviewsResult,
} from './hooks/use-product-reviews';

// Components
export {
  ProductReviewsSection,
  type ProductReviewsSectionProps,
} from './components/product-reviews-section';
export {
  ProductReviewsSummary,
  type ProductReviewsSummaryProps,
  ReviewsSummary,
  type ReviewsSummaryProps,
} from './components/reviews-summary';
export {
  ProductReviewsList,
  type ProductReviewsListProps,
  ReviewList,
  type ReviewListProps,
} from './components/review-list';
export {
  ReviewCard,
  type ReviewCardProps,
} from './components/review-card';
export {
  StarRating,
  type StarRatingProps,
} from './components/star-rating';
export {
  ReviewSubmissionModal,
  type ReviewSubmissionModalProps,
} from './components/review-submission-modal';
export {
  ReviewEditModal,
  type ReviewEditModalProps,
} from './components/review-edit-modal';
export {
  ImageLightbox,
  type ImageLightboxProps,
} from './components/image-lightbox';
export {
  ProductReviewsJsonLd,
  type ProductReviewsJsonLdProps,
} from './components/product-reviews-json-ld';
