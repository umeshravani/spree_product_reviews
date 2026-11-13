module SpreeProductReviews
  class Configuration < Spree::Preferences::Configuration
    # Core moderation & media limits
    preference :auto_approve_reviews, :boolean, default: false
    preference :max_images_per_review, :integer, default: 5
    preference :max_image_size_megabytes, :integer, default: 10
    preference :max_video_size_megabytes, :integer, default: 50
    preference :allow_videos, :boolean, default: true

    # General policies & submission eligibility
    preference :enabled, :boolean, default: true
    preference :require_approval, :boolean, default: true
    preference :review_status_default, :string, default: 'pending'
    preference :allow_anonymous, :boolean, default: false
    preference :allow_unverified, :boolean, default: false

    # Customer review editing permissions (existing / published reviews)
    preference :allow_edit_rating, :boolean, default: true
    preference :allow_edit_title, :boolean, default: true
    preference :allow_edit_body, :boolean, default: true
    preference :allow_edit_remove_media, :boolean, default: true
    preference :allow_edit_add_media, :boolean, default: true

    # Spam filtering & content safety
    preference :block_spam_reviews, :boolean, default: true
    preference :disable_review_links, :boolean, default: true
    preference :spam_words, :string, default: ''
    preference :customer_rate_limit_per_hour, :integer, default: 5
    preference :ip_rate_limit_per_hour, :integer, default: 10
    preference :report_moderation_threshold, :integer, default: 3
    preference :reviews_per_product_limit, :string, default: 'one_per_customer'
    preference :anonymize_ips, :boolean, default: true
    preference :duplicate_detection_window_hours, :integer, default: 24

    # Storefront modal flow
    preference :modal_mode, :string, default: 'multi'

    # Incentivized reviews & automatic Gift Card rewards
    preference :rewards_enabled, :boolean, default: true
    preference :photo_reward_enabled, :boolean, default: true
    preference :photo_reward_percentage, :integer, default: 15
    preference :photo_reward_amount, :decimal, default: 150.0
    preference :photo_reward_promotion_id, :string, default: ''
    preference :photo_reward_text, :string, default: 'Get 15% off your next purchase'

    preference :video_reward_enabled, :boolean, default: true
    preference :video_reward_percentage, :integer, default: 20
    preference :video_reward_amount, :decimal, default: 200.0
    preference :video_reward_promotion_id, :string, default: ''
    preference :video_reward_text, :string, default: 'Get 20% off your next purchase'

    # Multi-step wizard customizable copy
    preference :step1_title, :string, default: 'How would you rate this item?'
    preference :step1_dislike_label, :string, default: 'Dislike it'
    preference :step1_love_label, :string, default: 'Love it!'
    preference :step2_title, :string, default: 'Show it off'
    preference :step2_subtitle, :string, default: "We'd love to see it in action!"
    preference :step3_title, :string, default: 'Tell us more!'
    preference :step3_placeholder, :string, default: 'Share your experience'
    preference :step4_title, :string, default: 'Thank you for posting!'
    preference :step4_subtitle, :string, default: 'Your feedback helps others make better choices.'

    # Single-page form customizable copy
    preference :single_form_title, :string, default: 'Write a review'
    preference :single_form_description, :string, default: 'Share your feedback for this product'

    # Appearance: star rating & verified badge presentation
    preference :title_star_color, :string, default: '#FBBF24'
    preference :bottom_star_color, :string, default: '#FBBF24'
    preference :product_card_star_color, :string, default: '#FBBF24'
    preference :verified_badge_color, :string, default: '#000000'
    preference :title_rating_format, :string, default: '({rating}) {count} reviews'
    preference :title_reviews_label, :string, default: 'reviews'

    # Schema.org Structured Data / Rich Snippets (JSON-LD)
    preference :schema_markup_enabled, :boolean, default: true
    preference :schema_include_reviews, :boolean, default: true
    preference :schema_include_aggregate_rating, :boolean, default: true
    preference :schema_include_offers, :boolean, default: true
    preference :schema_show_shipping, :boolean, default: true
    preference :schema_price_valid_days, :integer, default: 30
    preference :schema_max_reviews_count, :integer, default: 10
    preference :schema_item_condition, :string, default: 'NewCondition'

    # Legacy v1 (6.0.0) & preferred_* compatibility accessors
    alias_method :max_images_upload, :max_images_per_review
    alias_method :max_images_upload=, :max_images_per_review=
    alias_method :max_image_size_mb, :max_image_size_megabytes
    alias_method :max_image_size_mb=, :max_image_size_megabytes=
    alias_method :max_video_size_mb, :max_video_size_megabytes
    alias_method :max_video_size_mb=, :max_video_size_megabytes=

    defaults.each_key do |pref|
      alias_method :"preferred_#{pref}", pref
      alias_method :"preferred_#{pref}=", :"#{pref}="
    end

    alias_method :preferred_max_images_upload, :max_images_per_review
    alias_method :preferred_max_images_upload=, :max_images_per_review=
    alias_method :preferred_max_image_size_mb, :max_image_size_megabytes
    alias_method :preferred_max_image_size_mb=, :max_image_size_megabytes=
    alias_method :preferred_max_video_size_mb, :max_video_size_megabytes
    alias_method :preferred_max_video_size_mb=, :max_video_size_megabytes=
  end
end
