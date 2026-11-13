module Spree
  class ReviewSetting < Spree.base_class
    self.table_name = 'spree_review_settings'

    has_prefix_id :rset

    BOOLEAN_KEYS = %i[
      enabled
      require_approval
      allow_anonymous
      allow_unverified
      allow_edit_rating
      allow_edit_title
      allow_edit_body
      allow_edit_remove_media
      allow_edit_add_media
      allow_videos
      block_spam_reviews
      disable_review_links
      anonymize_ips
      rewards_enabled
      photo_reward_enabled
      video_reward_enabled
      schema_markup_enabled
      schema_include_reviews
      schema_include_aggregate_rating
      schema_include_offers
      schema_show_shipping
    ].freeze

    INTEGER_KEYS = %i[
      max_images_per_review
      max_image_size_megabytes
      max_video_size_megabytes
      customer_rate_limit_per_hour
      ip_rate_limit_per_hour
      report_moderation_threshold
      duplicate_detection_window_hours
      photo_reward_percentage
      video_reward_percentage
      schema_price_valid_days
      schema_max_reviews_count
    ].freeze

    DECIMAL_KEYS = %i[
      photo_reward_amount
      video_reward_amount
    ].freeze

    STRING_KEYS = %i[
      spam_words
      reviews_per_product_limit
      modal_mode
      photo_reward_promotion_id
      photo_reward_text
      video_reward_promotion_id
      video_reward_text
      step1_title
      step1_dislike_label
      step1_love_label
      step2_title
      step2_subtitle
      step3_title
      step3_placeholder
      step4_title
      step4_subtitle
      single_form_title
      single_form_description
      title_star_color
      bottom_star_color
      product_card_star_color
      verified_badge_color
      title_rating_format
      title_reviews_label
      schema_item_condition
    ].freeze

    ALL_KEYS = (BOOLEAN_KEYS + INTEGER_KEYS + DECIMAL_KEYS + STRING_KEYS).freeze

    PUBLIC_KEYS = %i[
      enabled
      require_approval
      allow_anonymous
      allow_unverified
      allow_edit_rating
      allow_edit_title
      allow_edit_body
      allow_edit_remove_media
      allow_edit_add_media
      allow_videos
      max_images_per_review
      max_image_size_megabytes
      max_video_size_megabytes
      reviews_per_product_limit
      modal_mode
      rewards_enabled
      photo_reward_enabled
      photo_reward_percentage
      photo_reward_amount
      photo_reward_promotion_id
      photo_reward_text
      video_reward_enabled
      video_reward_percentage
      video_reward_amount
      video_reward_promotion_id
      video_reward_text
      step1_title
      step1_dislike_label
      step1_love_label
      step2_title
      step2_subtitle
      step3_title
      step3_placeholder
      step4_title
      step4_subtitle
      single_form_title
      single_form_description
      title_star_color
      bottom_star_color
      product_card_star_color
      verified_badge_color
      title_rating_format
      title_reviews_label
      schema_markup_enabled
      schema_include_reviews
      schema_include_aggregate_rating
      schema_include_offers
      schema_show_shipping
      schema_price_valid_days
      schema_max_reviews_count
      schema_item_condition
    ].freeze

    ALIASES = {
      'max_images_upload' => :max_images_per_review,
      'max_image_size_mb' => :max_image_size_megabytes,
      'max_video_size_mb' => :max_video_size_megabytes
    }.freeze

    belongs_to :store, class_name: 'Spree::Store'

    validates :store, presence: true
    validates :store_id, uniqueness: true

    def self.for_store(store)
      defaults = default_hash
      record = store.present? && table_exists? ? find_by(store_id: store.id) : nil
      stored = record&.settings.is_a?(Hash) ? record.settings.symbolize_keys : {}

      merged = defaults.merge(normalize_stored_hash(stored))
      # Preserve backwards compatibility when callers flip SpreeProductReviews::Config[:auto_approve_reviews] directly in code/tests
      if !stored.key?(:require_approval) && SpreeProductReviews::Config[:auto_approve_reviews]
        merged[:require_approval] = false
      end

      with_compatibility_aliases(merged)
    rescue ActiveRecord::StatementInvalid
      with_compatibility_aliases(default_hash)
    end

    def self.public_hash(store)
      full = for_store(store)
      subset = PUBLIC_KEYS.each_with_object({}) { |key, hash| hash[key] = full[key] }
      subset[:max_images_upload] = subset[:max_images_per_review]
      subset[:max_image_size_mb] = subset[:max_image_size_megabytes]
      subset[:max_video_size_mb] = subset[:max_video_size_megabytes]
      subset
    end

    def self.admin_hash(store)
      for_store(store)
    end

    def self.update_for_store!(store, raw_params)
      raise ArgumentError, 'store is required' if store.blank?

      record = find_or_initialize_by(store: store)
      current = record.settings.is_a?(Hash) ? record.settings.dup : {}
      incoming = normalize_incoming_params(raw_params)

      current.merge!(incoming.stringify_keys)
      record.settings = current
      record.save!

      for_store(store)
    end

    def self.default_hash
      config = SpreeProductReviews::Config
      ALL_KEYS.each_with_object({}) do |key, hash|
        hash[key] = config.respond_to?("preferred_#{key}") ? config.public_send("preferred_#{key}") : config[key]
      end
    end

    def self.normalize_stored_hash(hash)
      hash.each_with_object({}) do |(key, value), out|
        sym = ALIASES[key.to_s] || key.to_sym
        next unless ALL_KEYS.include?(sym)

        out[sym] = cast_value(sym, value)
      end
    end

    def self.normalize_incoming_params(raw_params)
      raw = raw_params.respond_to?(:to_h) ? raw_params.to_h : {}
      out = {}

      raw.each do |key, value|
        str_key = key.to_s
        if str_key == 'auto_approve_reviews' && !raw.key?('require_approval') && !raw.key?(:require_approval)
          out[:require_approval] = !cast_boolean(value)
          next
        end

        sym = ALIASES[str_key] || str_key.to_sym
        next unless ALL_KEYS.include?(sym)

        out[sym] = cast_value(sym, value)
      end

      out
    end

    def self.cast_value(key, value)
      if BOOLEAN_KEYS.include?(key)
        cast_boolean(value)
      elsif INTEGER_KEYS.include?(key)
        value.to_i
      elsif DECIMAL_KEYS.include?(key)
        value.to_f.round(2)
      else
        value.to_s
      end
    end

    def self.cast_boolean(value)
      ActiveModel::Type::Boolean.new.cast(value) ? true : false
    end

    def self.with_compatibility_aliases(hash)
      hash.merge(
        max_images_upload: hash[:max_images_per_review],
        max_image_size_mb: hash[:max_image_size_megabytes],
        max_video_size_mb: hash[:max_video_size_megabytes],
        auto_approve_reviews: !hash[:require_approval]
      )
    end
  end
end

