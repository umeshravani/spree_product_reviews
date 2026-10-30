// Type definitions for Spree Product Reviews Dashboard Plugin

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'spam' | 'hidden' | 'discarded'

export interface ReviewImage {
  id: string
  filename: string
  byte_size?: number
  content_type?: string
  url?: string
}

export interface ReviewCustomer {
  id: string
  email?: string | null
  name?: string | null
}

export interface ReviewProduct {
  id: string
  name: string
  slug?: string
}

export interface ReviewModerationAudit {
  id: string
  action: string
  moderator_name?: string | null
  note?: string | null
  metadata?: string | null
  created_at: string
}

export interface ProductReviewSummary {
  id: string
  product_id: string
  product_name: string
  customer_id?: string | null
  user_id?: string | null
  reviewer_name: string
  rating: number
  title: string
  review: string
  status: ReviewStatus
  approved: boolean
  spam: boolean
  hidden: boolean
  rejected: boolean
  verified_purchaser: boolean
  helpful_count: number
  unhelpful_count: number
  images_count: number
  created_at: string
  updated_at: string
}

export interface ProductReviewDetail extends ProductReviewSummary {
  ip_address?: string | null
  locale?: string | null
  moderated_at?: string | null
  moderator_name?: string | null
  moderator_note?: string | null
  discarded_at?: string | null
  images: ReviewImage[]
  customer?: ReviewCustomer | null
  product?: ReviewProduct | null
  moderation_audits: ReviewModerationAudit[]
}

export interface ReviewCounts {
  pending: number
  approved: number
  rejected: number
  spam: number
  hidden: number
  total: number
}

export interface ProductWidgetSummary {
  product_id: string
  product_name: string
  average_rating: number
  review_count: number
  pending_count: number
  approved_count: number
  rejected_count: number
  spam_count: number
  recent_reviews: ProductReviewSummary[]
}

export interface ReviewListParams {
  status?: string
  rating?: number | string
  product_id?: string
  q?: string
  sort?: string
  page?: number
  per_page?: number
}

export interface ReviewListResponse {
  data: ProductReviewSummary[]
  meta: {
    total_count: number
    page: number
    per_page: number
  }
}
