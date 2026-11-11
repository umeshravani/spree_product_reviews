export interface ProductCardSummary {
  product_id: string;
  average_rating: number;
  reviews_count: number;
}

export interface ReviewSummary {
  id?: string;
  product_id: string;
  average_rating: number;
  reviews_count: number;
  rating_distribution: Record<string, number>;
  summary_data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ReviewMediaItem {
  id?: string;
  position: number;
  alt: string | null;
  url: string | null;
  content_type: string | null;
  byte_size: number | null;
  media_type?: "image" | "video";
  filename?: string | null;
}

export interface ReviewAnswerItem {
  question_id: string;
  question_key: string;
  question_label: string;
  kind: ReviewQuestionKind;
  option_id: string | null;
  value: string | number | boolean | null;
  label: string | null;
}

export interface ReviewItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  purchased_option_values: string[];
  rating: number;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected" | "spam" | "hidden";
  verified_purchase: boolean;
  show_identifier?: boolean;
  reviewer_display_name: string;
  locale: string | null;
  helpful_count: number;
  not_helpful_count: number;
  flagged_count?: number;
  current_vote: "helpful" | "not_helpful" | null;
  reward_code?: string | null;
  reward_amount?: string | null;
  created_at: string;
  updated_at: string;
  media: ReviewMediaItem[];
  answers: ReviewAnswerItem[];
}

export interface ReviewPaginationMeta {
  page: number;
  limit: number;
  count: number;
  pages: number;
  from?: number;
  to?: number;
  in?: number;
  previous?: number | null;
  next?: number | null;
}

export interface ReviewsListResponse {
  data: ReviewItem[];
  meta: ReviewPaginationMeta;
}

export interface ReviewFilterValue {
  value: string;
  label: string;
  count: number;
}

export interface ReviewFilter {
  id: string;
  question_id?: string;
  type: string;
  label: string;
  values: ReviewFilterValue[];
}

export interface ReviewSortOption {
  id: string;
  label: string;
}

export interface ReviewFiltersResponse {
  filters: ReviewFilter[];
  sort_options: ReviewSortOption[];
  default_sort: string;
  total_count: number;
}

export type ReviewQuestionKind =
  | "single_select"
  | "multi_select"
  | "scale"
  | "boolean"
  | "text";

export interface ReviewQuestionOption {
  value: string;
  label: string;
  position: number;
}

export interface ReviewQuestion {
  id?: string;
  key: string;
  label: string;
  kind: ReviewQuestionKind;
  applies_to: "store" | "product" | "category";
  filterable: boolean;
  required: boolean;
  position: number;
  options: ReviewQuestionOption[];
}

export interface ReviewStoreSettings {
  enabled: boolean;
  require_approval: boolean;
  allow_anonymous: boolean;
  allow_unverified: boolean;
  allow_edit_rating: boolean;
  allow_edit_title: boolean;
  allow_edit_body: boolean;
  allow_edit_remove_media: boolean;
  allow_edit_add_media: boolean;
  allow_videos: boolean;
  max_images_per_review: number;
  max_image_size_megabytes: number;
  max_video_size_megabytes: number;
  reviews_per_product_limit: string;
  modal_mode: "single" | "multi";
  rewards_enabled: boolean;
  photo_reward_enabled: boolean;
  photo_reward_percentage: number;
  photo_reward_amount: number;
  photo_reward_promotion_id: string;
  photo_reward_text: string;
  video_reward_enabled: boolean;
  video_reward_percentage: number;
  video_reward_amount: number;
  video_reward_promotion_id: string;
  video_reward_text: string;
  step1_title: string;
  step1_dislike_label: string;
  step1_love_label: string;
  step2_title: string;
  step2_subtitle: string;
  step3_title: string;
  step3_placeholder: string;
  step4_title: string;
  step4_subtitle: string;
  single_form_title: string;
  single_form_description: string;
  title_star_color: string;
  bottom_star_color: string;
  product_card_star_color?: string;
  verified_badge_color?: string;
  title_rating_format: string;
  title_reviews_label: string;
}

export interface ReviewEligibilityResponse {
  product_id: string;
  variant_id: string | null;
  order_id: string | null;
  can_review: boolean;
  reason:
    | "reviews_disabled"
    | "login_required"
    | "not_purchased"
    | "already_reviewed"
    | null;
  verified_purchase: boolean;
  already_reviewed: boolean;
  review_id: string | null;
  existing_review?: ReviewItem | null;
  eligible_order_id: string | null;
  settings?: ReviewStoreSettings;
}

export interface ReviewListQuery {
  page?: number;
  limit?: number;
  rating?: number | number[];
  with_images?: boolean;
  with_videos?: boolean;
  verified_purchase?: boolean;
  sort?: string;
  answers?: Record<string, string | string[]>;
}

export interface CreateReviewInput {
  rating: number;
  title: string;
  body?: string;
  reviewer_name?: string;
  show_identifier?: boolean;
  locale?: string;
  variant_id?: string;
  order_id?: string;
  answers?: Record<string, string | string[] | number | boolean>;
  images?: { signed_id: string; alt?: string; position?: number }[];
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string;
  body?: string;
  show_identifier?: boolean;
  answers?: Record<string, string | string[] | number | boolean>;
  images?: { signed_id: string; alt?: string; position?: number }[];
  remove_media_ids?: string[];
}

export interface ReportReviewInput {
  reason: string;
  details?: string;
}

