# frozen_string_literal: true

module SpreeProductReviews
  class Configuration < (defined?(Spree::Preferences::Configuration) ? Spree::Preferences::Configuration : Object)
    if defined?(Spree::Preferences::Configuration)
      preference :enabled, :boolean, default: true
      preference :require_approval, :boolean, default: true
      preference :review_status_default, :string, default: 'pending'
      preference :allow_anonymous, :boolean, default: false
      preference :allow_unverified, :boolean, default: true
      preference :max_images_upload, :integer, default: 5
      preference :max_image_size_mb, :integer, default: 5
      preference :block_spam_reviews, :boolean, default: true
      preference :disable_review_links, :boolean, default: true
      preference :spam_words, :string, default: ''
      preference :customer_rate_limit_per_hour, :integer, default: 5
      preference :ip_rate_limit_per_hour, :integer, default: 10
      preference :report_moderation_threshold, :integer, default: 3
      preference :reviews_per_product_limit, :string, default: 'one_per_customer'
      preference :anonymize_ips, :boolean, default: true
      preference :duplicate_detection_window_hours, :integer, default: 24

      # Modal submission mode & styling
      preference :modal_mode, :string, default: 'multi' # 'single' or 'multi'
      preference :rewards_enabled, :boolean, default: true

      # Photo and Video rewards
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

      # Multi-step wizard customizable labels
      preference :step1_title, :string, default: 'How would you rate this item?'
      preference :step1_dislike_label, :string, default: 'Dislike it'
      preference :step1_love_label, :string, default: 'Love it!'
      preference :step2_title, :string, default: 'Show it off'
      preference :step2_subtitle, :string, default: "We'd love to see it in action!"
      preference :step3_title, :string, default: 'Tell us more!'
      preference :step3_placeholder, :string, default: 'Share your experience'
      preference :step4_title, :string, default: 'Thank you for posting!'
      preference :step4_subtitle, :string, default: 'Your feedback helps others make better choices.'

      # Single page form labels
      preference :single_form_title, :string, default: 'Write a review'
      preference :single_form_description, :string, default: 'Share your feedback for this product'

      # Star Rating Presentation
      preference :title_star_color, :string, default: '#000000'
      preference :bottom_star_color, :string, default: '#FBBF24'
      preference :title_rating_format, :string, default: '{rating}/5 {count}+ reviews'
      preference :title_reviews_label, :string, default: 'reviews'
    else
      attr_accessor :enabled, :require_approval, :review_status_default,
                    :allow_anonymous, :allow_unverified, :max_images_upload,
                    :max_image_size_mb, :block_spam_reviews, :disable_review_links,
                    :spam_words, :customer_rate_limit_per_hour, :ip_rate_limit_per_hour,
                    :report_moderation_threshold, :reviews_per_product_limit,
                    :anonymize_ips, :duplicate_detection_window_hours,
                    :modal_mode, :rewards_enabled,
                    :photo_reward_enabled, :photo_reward_percentage, :photo_reward_amount, :photo_reward_promotion_id, :photo_reward_text,
                    :video_reward_enabled, :video_reward_percentage, :video_reward_amount, :video_reward_promotion_id, :video_reward_text,
                    :step1_title, :step1_dislike_label, :step1_love_label,
                    :step2_title, :step2_subtitle,
                    :step3_title, :step3_placeholder,
                    :step4_title, :step4_subtitle,
                    :single_form_title, :single_form_description,
                    :title_star_color, :bottom_star_color, :title_rating_format, :title_reviews_label

      def initialize
        @enabled = true
        @require_approval = true
        @review_status_default = 'pending'
        @allow_anonymous = false
        @allow_unverified = true
        @max_images_upload = 5
        @max_image_size_mb = 5
        @block_spam_reviews = true
        @disable_review_links = true
        @spam_words = ''
        @customer_rate_limit_per_hour = 5
        @ip_rate_limit_per_hour = 10
        @report_moderation_threshold = 3
        @reviews_per_product_limit = 'one_per_customer'
        @anonymize_ips = true
        @duplicate_detection_window_hours = 24

        @modal_mode = 'multi'
        @rewards_enabled = true
        @photo_reward_enabled = true
        @photo_reward_percentage = 15
        @photo_reward_amount = 150.0
        @photo_reward_promotion_id = ''
        @photo_reward_text = 'Get 15% off your next purchase'
        @video_reward_enabled = true
        @video_reward_percentage = 20
        @video_reward_amount = 200.0
        @video_reward_promotion_id = ''
        @video_reward_text = 'Get 20% off your next purchase'
        @step1_title = 'How would you rate this item?'
        @step1_dislike_label = 'Dislike it'
        @step1_love_label = 'Love it!'
        @step2_title = 'Show it off'
        @step2_subtitle = "We'd love to see it in action!"
        @step3_title = 'Tell us more!'
        @step3_placeholder = 'Share your experience'
        @step4_title = 'Thank you for posting!'
        @step4_subtitle = 'Your feedback helps others make better choices.'
        @single_form_title = 'Write a review'
        @single_form_description = 'Share your feedback for this product'
        @title_star_color = '#000000'
        @bottom_star_color = '#FBBF24'
        @title_rating_format = '{rating}/5 {count}+ reviews'
        @title_reviews_label = 'reviews'
      end
    end
  end
end
