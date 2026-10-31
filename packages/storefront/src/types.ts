/**
 * Types for Spree 6 Storefront Product Reviews
 */

export interface ReviewImage {
  id: string
  url: string
  content_type?: string
  filename?: string
}

export interface ProductReview {
  id: string
  title: string
  review: string
  rating: number
  reviewer_name: string
  is_verified_purchase: boolean
  purchase_date?: string | null
  helpful_count: number
  unhelpful_count: number
  helpful_votes_count?: number
  unhelpful_votes_count?: number
  created_at: string
  images: ReviewImage[]
  customer_id?: string | null
}

export type RatingDistribution = Record<number | string, number>

export interface ReviewsMeta {
  total_count: number
  page: number
  per_page: number
  average_rating: number
  review_count: number
  rating_distribution: RatingDistribution
  message?: string
  pagination?: {
    total_pages: number
    current_page: number
    per_page: number
    total_count: number
  }
}

export interface ReviewListResponse {
  data: ProductReview[]
  meta: ReviewsMeta
}

export type ReviewSortOption =
  | 'newest'
  | 'oldest'
  | 'highest_rating'
  | 'lowest_rating'
  | 'most_helpful'
  | 'most_recent'

export interface ReviewListQuery {
  page?: number
  per_page?: number
  rating?: number | null
  sort?: ReviewSortOption
}

export interface CreateReviewPayload {
  rating: number
  title: string
  review: string
  name?: string
  show_identifier?: boolean
  images?: File[]
}

export interface UpdateReviewPayload {
  rating?: number
  title?: string
  review?: string
}

export interface ReviewsClientConfig {
  baseUrl?: string
  apiHost?: string
  bearerToken?: string
  fetchFn?: typeof fetch
  getAuthToken?: () => string | null | Promise<string | null>
  headers?: Record<string, string>
}

// Convenient Aliases
export type ListReviewsParams = ReviewListQuery
export type ReviewsResponse = ReviewListResponse
