export interface Page<T> {
  data: T[]
  meta: { page: number; pages: number; count: number }
}

export interface ReviewMedia {
  id: string
  url: string | null
  alt: string | null
  content_type?: string | null
  byte_size?: number | null
  media_type?: 'image' | 'video'
  filename?: string | null
  position?: number
}

export interface ReviewAnswer {
  id: string
  question_label: string
  label: string | number | boolean | null
}

export interface ReviewModerationAudit {
  id: string
  action: string
  moderator_name: string | null
  note: string | null
  created_at: string
}

export interface ReviewReport {
  id: string
  reason: string
  details: string | null
  created_at: string
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'spam' | 'hidden'

export interface Review {
  id: string
  product_id: string
  product_name?: string | null
  product_slug?: string | null
  product_thumbnail_url?: string | null
  variant_id: string | null
  customer_id: string | null
  order_id: string | null
  reviewer_name: string | null
  reviewer_display_name?: string | null
  rating: number
  title: string
  body: string | null
  status: ReviewStatus
  verified_purchase: boolean
  show_identifier?: boolean
  hidden?: boolean
  spam?: boolean
  spam_score?: number
  flagged_count?: number
  helpful_count: number
  not_helpful_count: number
  locale: string | null
  ip_address?: string | null
  moderated_at?: string | null
  moderator_name?: string | null
  moderator_note?: string | null
  reward_code?: string | null
  reward_amount?: string | null
  reward_gift_card_id?: string | null
  created_at: string
  updated_at: string
  media: ReviewMedia[]
  answers: ReviewAnswer[]
  moderation_audits?: ReviewModerationAudit[]
  reports?: ReviewReport[]
}

export interface ReviewCounts {
  all: number
  total: number
  pending: number
  approved: number
  rejected: number
  spam: number
  hidden: number
  flagged: number
}

export interface ReviewSettings {
  enabled: boolean
  require_approval: boolean
  allow_anonymous: boolean
  allow_unverified: boolean
  allow_edit_rating: boolean
  allow_edit_title: boolean
  allow_edit_body: boolean
  allow_edit_remove_media: boolean
  allow_edit_add_media: boolean
  allow_videos: boolean
  max_images_per_review: number
  max_images_upload?: number
  max_image_size_megabytes: number
  max_image_size_mb?: number
  max_video_size_megabytes: number
  max_video_size_mb?: number
  block_spam_reviews: boolean
  disable_review_links: boolean
  spam_words: string
  customer_rate_limit_per_hour: number
  ip_rate_limit_per_hour: number
  report_moderation_threshold: number
  reviews_per_product_limit: string
  anonymize_ips: boolean
  duplicate_detection_window_hours: number
  modal_mode: 'single' | 'multi'
  rewards_enabled: boolean
  photo_reward_enabled: boolean
  photo_reward_percentage: number
  photo_reward_amount: number
  photo_reward_promotion_id: string
  photo_reward_text: string
  video_reward_enabled: boolean
  video_reward_percentage: number
  video_reward_amount: number
  video_reward_promotion_id: string
  video_reward_text: string
  step1_title: string
  step1_dislike_label: string
  step1_love_label: string
  step2_title: string
  step2_subtitle: string
  step3_title: string
  step3_placeholder: string
  step4_title: string
  step4_subtitle: string
  single_form_title: string
  single_form_description: string
  title_star_color: string
  bottom_star_color: string
  product_card_star_color?: string
  verified_badge_color?: string
  title_rating_format: string
  title_reviews_label: string
  schema_markup_enabled?: boolean
  schema_include_reviews?: boolean
  schema_include_aggregate_rating?: boolean
  schema_include_offers?: boolean
  schema_show_shipping?: boolean
  schema_price_valid_days?: number
  schema_max_reviews_count?: number
  schema_item_condition?: string
}

export interface QuestionOption {
  id?: string
  value: string
  label: string
  active: boolean
  position: number
  _destroy?: boolean
}

export interface Question {
  id: string
  key: string
  label: string
  kind: 'single_select' | 'multi_select' | 'scale' | 'boolean' | 'text'
  applies_to: 'store' | 'product' | 'category'
  product_id: string | null
  category_id: string | null
  required: boolean
  filterable: boolean
  active: boolean
  position: number
  options: QuestionOption[]
}

export interface Choice {
  id: string
  name: string
  pretty_name?: string | null
  products_count?: number
}
