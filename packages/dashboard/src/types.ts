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
  product_thumbnail_url?: string | null
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
  reward_code?: string | null
  reward_amount?: number | null
  reward_gift_card_id?: number | null
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

export interface ProductReviewsSettings {
  enabled: boolean
  require_approval: boolean
  review_status_default?: string
  allow_anonymous: boolean
  allow_unverified: boolean
  max_images_upload: number
  max_image_size_mb?: number
  block_spam_reviews: boolean
  disable_review_links: boolean
  spam_words: string
  customer_rate_limit_per_hour?: number
  ip_rate_limit_per_hour?: number
  report_moderation_threshold: number
  reviews_per_product_limit?: number
  anonymize_ips?: boolean
  duplicate_detection_window_hours?: number
  modal_mode?: 'single' | 'multi'
  rewards_enabled?: boolean
  photo_reward_enabled?: boolean
  photo_reward_percentage?: number
  photo_reward_amount?: number
  photo_reward_text?: string
  video_reward_enabled?: boolean
  video_reward_percentage?: number
  video_reward_amount?: number
  video_reward_text?: string
  step1_title?: string
  step1_dislike_label?: string
  step1_love_label?: string
  step2_title?: string
  step2_subtitle?: string
  step3_title?: string
  step3_placeholder?: string
  step4_title?: string
  step4_subtitle?: string
  title_star_color?: string
  title_rating_format?: string
  title_reviews_label?: string
}
